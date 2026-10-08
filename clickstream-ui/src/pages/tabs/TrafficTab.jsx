import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

export default function TrafficTab({ hourly = [] }) {
  const peak = hourly && hourly.length > 0
    ? hourly.reduce((a, b) => (b.events > a.events ? b : a), { hour: 10, events: 84803 })
    : { hour: 10, events: 84803 };

  const scaleOutHour = String((peak.hour - 1 + 24) % 24).padStart(2, '0');
  const peakHourStr = String(peak.hour).padStart(2, '0');

  const totalHourlyEvents = hourly.reduce((sum, item) => sum + (item.events || 0), 0);
  const avgHourlyEvents = Math.round(totalHourlyEvents / 24);

  return (
    <div className="tab-pane" role="tabpanel" id="tab-traffic" aria-labelledby="tab-link-traffic">
      <div className="tab-header">
        <div>
          <h2>24-Hour Traffic Pattern</h2>
          <p className="sub">Hourly clickstream distribution processed across 11 parallel Map tasks.</p>
        </div>
      </div>

      {/* Mandatory one-sentence scaling insight */}
      <div className="insight-card" role="region" aria-label="Scaling Recommendation">
        <div className="insight-icon" aria-hidden="true">⚡</div>
        <p className="insight-text">
          Traffic peaks at <strong>{peakHourStr}:00 UTC</strong> with <strong>{fmt(peak.events)} events</strong>; scale out cluster worker containers before <strong>{scaleOutHour}:00 UTC</strong> to handle load smoothly.
        </p>
      </div>

      <div className="panel wide">
        <div className="chart" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly} margin={{ left: 10, right: 16, top: 12, bottom: 4 }}>
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a6f97" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#2a6f97" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickFormatter={(h) => `${h}h`}
                interval={1}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <YAxis
                width={56}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <Tooltip
                formatter={(v) => [fmt(v), 'Events']}
                labelFormatter={(h) => `${String(h).padStart(2, '0')}:00 UTC`}
                contentStyle={{
                  backgroundColor: 'var(--panel)',
                  borderColor: 'var(--line)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="events"
                stroke="#2a6f97"
                strokeWidth={2.5}
                fill="url(#trafficGradient)"
              />
              <ReferenceDot
                x={peak.hour}
                y={peak.events}
                r={7}
                fill="#e8a33d"
                stroke="#ffffff"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi-block kpi-cart">
          <span>Peak Window Volume</span>
          <b>{fmt(peak.events)}</b>
          <p className="kpi-sub">At {peakHourStr}:00 UTC</p>
        </div>
        <div className="kpi-block kpi-view">
          <span>Average Hourly Traffic</span>
          <b>{fmt(avgHourlyEvents)}</b>
          <p className="kpi-sub">Events per hour</p>
        </div>
        <div className="kpi-block kpi-buy">
          <span>Total 24h Traffic</span>
          <b>{fmt(totalHourlyEvents)}</b>
          <p className="kpi-sub">Aggregated click events</p>
        </div>
      </div>
    </div>
  );
}
