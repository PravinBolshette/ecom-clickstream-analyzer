// Express API: turns Hadoop's part-00000 into JSON for the React dashboard.
// Run: npm i express cors && node server.js   (PART_FILE=/path/to/part-00000 to override)
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const PART_FILE = process.env.PART_FILE
  ? path.resolve(process.env.PART_FILE)
  : path.join(__dirname, '..', '..', 'part-00000');
const NAMENODE = process.env.NAMENODE || 'http://localhost:9870';

// Expected reducer lines (tab separated): FUNNEL\tVIEW\t123 | HOURLY\t14\t99 | PROD_VIEW\tP1024\t7
function parsePart() {
  if (!fs.existsSync(PART_FILE)) return null;
  const d = { FUNNEL: {}, HOURLY: {}, PROD_VIEW: {}, PROD_CART: {}, PROD_PURCHASE: {} };
  for (const line of fs.readFileSync(PART_FILE, 'utf8').split('\n')) {
    const [k, s0, c] = line.trim().split('\t');
    const s = k === 'HOURLY' ? String(Number(s0)) : s0; // "07" -> "7"
    if (d[k] && s0 !== undefined) d[k][s] = Number(c) || 0;
  }
  return d;
}

const DEMO = {
  FUNNEL: { VIEW: 61240, ADD_TO_CART: 14870, PURCHASE: 3920 },
  HOURLY: Object.fromEntries(
    Array.from({ length: 24 }, (_, h) => [h, Math.round(900 + 2600 * Math.exp(-((h - 20) ** 2) / 14) + 1400 * Math.exp(-((h - 12) ** 2) / 18))])
  ),
  PROD_VIEW: { P1024: 5120, P2210: 4480, P1007: 3910, P3301: 3550, P1188: 3120, P4012: 2870, P2975: 2490, P1530: 2210 },
  PROD_CART: {},
  PROD_PURCHASE: { P1024: 210, P2210: 402, P1007: 95, P3301: 340, P1188: 188, P4012: 150, P2975: 61, P1530: 133 },
};

app.get('/api/metrics', (_req, res) => {
  const real = parsePart();
  const d = real && Object.keys(real.FUNNEL).length ? real : DEMO;
  const views = d.FUNNEL.VIEW || 0, carts = d.FUNNEL.ADD_TO_CART || d.FUNNEL.CART || 0, purchases = d.FUNNEL.PURCHASE || 0;
  res.json({
    demo: d === DEMO,
    views, carts, purchases,
    conversion: views ? (purchases / views) * 100 : 0,
    abandonment: carts ? ((carts - purchases) / carts) * 100 : 0,
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, events: d.HOURLY[h] || 0 })),
    products: Object.entries(d.PROD_VIEW)
      .map(([id, v]) => ({ id, views: v, purchases: d.PROD_PURCHASE[id] || 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8),
  });
});

// Live HDFS state from the NameNode JMX endpoint; falls back to a static snapshot.
app.get('/api/cluster', async (_req, res) => {
  try {
    const r = await fetch(`${NAMENODE}/jmx?qry=Hadoop:service=NameNode,name=FSNamesystemState`);
    const b = (await r.json()).beans[0];
    res.json({ live: true, replication: 2, liveNodes: b.NumLiveDataNodes, deadNodes: b.NumDeadDataNodes, underReplicated: b.UnderReplicatedBlocks });
  } catch {
    res.json({ live: false, replication: 2, liveNodes: 2, deadNodes: 0, underReplicated: 0 });
  }
});

app.listen(4000, () => console.log('API on :4000 (reading ' + PART_FILE + ')'));
