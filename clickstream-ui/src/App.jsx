import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceDot } from 'recharts';
import './App.css';

const API = import.meta.env.VITE_API || 'http://localhost:4000';
const fmt = (n) => Math.round(n).toLocaleString('en-IN');

// The signature element: the funnel drawn as one flowing river that narrows.
function Funnel({ views, carts, purchases }) {
  const W = 900, mid = 120, H = 200, xs = [30, 430, 830];
  const hs = [H, Math.max((H * carts) / views, 12), Math.max((H * purchases) / views, 8)];
  const labels = [['Viewed a product', views], ['Added to cart', carts], ['Purchased', purchases]];
  const band = (i, fill) => {
    const x1 = xs[i] + 14, x2 = xs[i + 1], a = hs[i] / 2, b = hs[i + 1] / 2, m = (x1 + x2) / 2;
    return (
      <path key={i} fill={fill}
        d={`M${x1},${mid - a} C${m},${mid - a} ${m},${mid - b} ${x2},${mid - b} L${x2},${mid + b} C${m},${mid + b} ${m},${mid + a} ${x1},${mid + a}Z`} />
    );
  };
  return (
    <svg viewBox={`0 0 ${W} 270`} role="img" aria-label="Funnel from views to carts to purchases" className="funnel">
      {band(0, 'var(--view-soft)')}
      {band(1, 'var(--cart-soft)')}
      {xs.map((x, i) => (
        <rect key={i} x={x} y={mid - hs[i] / 2} width="14" height={hs[i]} rx="3" fill={['var(--view)', 'var(--cart)', 'var(--buy)'][i]} />
      ))}
      <text x={(xs[0] + xs[1]) / 2} y={mid + 4} className="drop">{fmt(views - carts)} left before the cart</text>
      <text x={(xs[1] + xs[2]) / 2} y={mid + 4} className="drop">{fmt(carts - purchases)} left at checkout</text>
      {labels.map(([t, v], i) => (
        <g key={t} transform={`translate(${xs[i] - (i === 2 ? 110 : 0)},238)`}>
          <text className="stage-n">{fmt(v)}</text>
          <text y="20" className="stage-t">{t}</text>
        </g>
      ))}
    </svg>
  );
}

// Fault-tolerance demo: stop a DataNode and watch HDFS serve from the replica.
function Cluster({ info }) {
  const [down, setDown] = useState(false);
  const nodes = [
    { name: 'datanode1', role: 'DataNode', ok: true },
    { name: 'datanode2', role: 'DataNode', ok: !down },
  ];
  return (
    <section className="panel">
      <h2>HDFS cluster</h2>
      <p className="sub">
        Replication factor {info.replication}. {info.live ? 'Live from the NameNode.' : 'Showing a saved snapshot.'}
      </p>
      <div className="nodes">
        <div className="node master"><b>namenode</b><span>Tracks where every block lives</span></div>
        {nodes.map((n) => (
          <div key={n.name} className={'node' + (n.ok ? '' : ' dead')}>
            <b>{n.name}</b><span>{n.ok ? 'Healthy, sending heartbeats' : 'No heartbeat, marked dead'}</span>
          </div>
        ))}
      </div>
      <p className="status" aria-live="polite">
        {down
          ? 'Reads continue from datanode1. HDFS re-replicates the lost blocks once a new node joins.'
          : 'All blocks have 2 copies. Every file is readable from either node.'}
      </p>
      <button onClick={() => setDown(!down)}>{down ? 'Restart datanode2' : 'Stop datanode2'}</button>
    </section>
  );
}

export default function App() {
  const [m, setM] = useState(null);
  const [cluster, setCluster] = useState({ replication: 2, live: false });
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/metrics`).then((r) => r.json()).then(setM).catch(() => setErr(true));
    fetch(`${API}/api/cluster`).then((r) => r.json()).then(setCluster).catch(() => {});
  }, []);

  if (err) return <main className="center"><h1>Can't reach the API</h1><p>Start it with <code>node server/server.js</code>, then reload.</p></main>;
  if (!m) return <main className="center"><p>Loading metrics…</p></main>;

  const peak = m.hourly.reduce((a, b) => (b.events > a.events ? b : a));
  const per100 = (m.purchases / m.views) * 100;

  return (
    <div className="shell">
      <aside className="rail">
        <div className="logo">Clickstream</div>
        <nav>
          <a href="#funnel">Funnel</a><a href="#traffic">Traffic</a><a href="#products">Products</a><a href="#cluster">Cluster</a>
        </nav>
        <p className="rail-note">Source: MapReduce output on HDFS{m.demo && ' (demo data, part-00000 not found)'}</p>
      </aside>

      <main>
        <header>
          <h1>Of every 100 product views, {per100.toFixed(1)} end in a purchase.</h1>
          <p className="lead">
            {m.abandonment.toFixed(0)}% of shoppers who add to cart leave without paying. Traffic peaks at {String(peak.hour).padStart(2, '0')}:00, so that is the hour to scale out.
          </p>
        </header>

        <section id="funnel" className="panel wide"><Funnel views={m.views} carts={m.carts} purchases={m.purchases} /></section>

        <div className="kpis">
          <div><span>Conversion rate</span><b>{m.conversion.toFixed(2)}%</b></div>
          <div><span>Cart abandonment</span><b>{m.abandonment.toFixed(1)}%</b></div>
          <div><span>Events processed</span><b>{fmt(m.views + m.carts + m.purchases)}</b></div>
        </div>

        <section id="traffic" className="panel">
          <h2>Events by hour</h2>
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={m.hourly} margin={{ left: 0, right: 8, top: 8 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a6f97" stopOpacity=".45" /><stop offset="1" stopColor="#2a6f97" stopOpacity="0" /></linearGradient></defs>
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickFormatter={(h) => `${h}h`} interval={2} />
                <YAxis width={44} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [fmt(v), 'Events']} labelFormatter={(h) => `${h}:00`} />
                <Area dataKey="events" stroke="#2a6f97" strokeWidth={2} fill="url(#g)" />
                <ReferenceDot x={peak.hour} y={peak.events} r={6} fill="#e8a33d" stroke="#fff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section id="products" className="panel">
          <h2>Most viewed products</h2>
          <p className="sub">Many views and few purchases can point to a price problem.</p>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={m.products} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="id" width={54} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v, n) => [fmt(v), n]} />
                <Bar dataKey="views" name="Views" fill="#9cc3d9" radius={4} />
                <Bar dataKey="purchases" name="Purchases" fill="#1d7a5f" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div id="cluster"><Cluster info={cluster} /></div>
      </main>
    </div>
  );
}
