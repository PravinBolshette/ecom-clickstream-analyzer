import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';
import { fetchSummary, fetchHourly, fetchFunnel } from '../../services/api.js';
import SourceBadge from '../../components/SourceBadge.jsx';
import MetricTooltip from '../../components/MetricTooltip.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState.jsx';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

export default function OverviewTab() {
  const [summary, setSummary] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchSummary(), fetchHourly(), fetchFunnel()])
      .then(([sRes, hRes, fRes]) => {
        setSummary(sRes);
        setHourlyData(hRes);
        setFunnelData(fRes);
      })
      .catch((err) => {
        setError(err.message || 'Error communicating with analytics API');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([fetchSummary(), fetchHourly(), fetchFunnel()])
      .then(([sRes, hRes, fRes]) => {
        if (!ignore) {
          setSummary(sRes);
          setHourlyData(hRes);
          setFunnelData(fRes);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Error communicating with analytics API');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-overview" aria-labelledby="tab-link-overview">
        <LoadingSkeleton height={320} lines={5} />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-overview" aria-labelledby="tab-link-overview">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  const {
    totalEvents = 2000000,
    views = 802574,
    cartAdds = 360035,
    purchases = 138275,
    conversionRate = 17.23,
    cartAbandonmentRate = 61.59,
    peakHour = 10,
    peakEvents = 84803,
    source = 'hadoop'
  } = summary;

  const peakHourStr = String(peakHour).padStart(2, '0');
  const scaleOutHour = String((peakHour - 1 + 24) % 24).padStart(2, '0');

  // Funnel calculations
  const _droppedBeforeCart = views - cartAdds;
  const droppedAtCheckout = cartAdds - purchases;
  const funnel = funnelData?.stages || [
    { stage: 'SEARCH', count: 699116 },
    { stage: 'VIEW', count: views },
    { stage: 'ADD_TO_CART', count: cartAdds },
    { stage: 'PURCHASE', count: purchases }
  ];

  return (
    <div className="tab-pane" role="tabpanel" id="tab-overview" aria-labelledby="tab-link-overview">
      {/* Tab Header with Badge */}
      <div className="tab-header flex-between">
        <div>
          <h2>E-Commerce Overview & Telemetry</h2>
          <p className="sub">
            Real-time aggregate telemetry processed via Hadoop Streaming across partitioned HDFS blocks.
          </p>
        </div>
        <SourceBadge source={source} />
      </div>

      {/* KPI Cards Row */}
      <div className="kpis-grid" role="region" aria-label="Key Performance Indicators">
        <div className="kpi-card-panel kpi-events">
          <div className="kpi-card-head">
            <span className="kpi-title">Total Ingested Events</span>
            <MetricTooltip
              title="Total Events"
              formula="SEARCH + VIEW + ADD_TO_CART + PURCHASE"
              description="Consolidated clickstream telemetry volume processed through YARN NodeManagers."
            />
          </div>
          <b className="kpi-metric-val">{fmt(totalEvents)}</b>
          <span className="kpi-meta-sub">Across 11 distributed HDFS blocks</span>
        </div>

        <div className="kpi-card-panel kpi-conversion">
          <div className="kpi-card-head">
            <span className="kpi-title">Conversion Rate</span>
            <MetricTooltip
              title="Conversion Rate"
              formula="conversionRate = (purchases / views) * 100"
              description="Event-based purchase conversion efficiency across all catalog product views."
            />
          </div>
          <b className="kpi-metric-val">{conversionRate.toFixed(2)}%</b>
          <span className="kpi-meta-sub">{fmt(purchases)} finalized orders</span>
        </div>

        <div className="kpi-card-panel kpi-abandonment">
          <div className="kpi-card-head">
            <span className="kpi-title">Cart Abandonment Rate</span>
            <MetricTooltip
              title="Cart Abandonment"
              formula="cartAbandonment = ((cartAdds - purchases) / cartAdds) * 100"
              description="Proportion of shopping carts that failed to reach finalized checkout confirmation."
            />
          </div>
          <b className="kpi-metric-val">{cartAbandonmentRate.toFixed(1)}%</b>
          <span className="kpi-meta-sub">{fmt(droppedAtCheckout)} abandoned carts</span>
        </div>

        <div className="kpi-card-panel kpi-peak">
          <div className="kpi-card-head">
            <span className="kpi-title">Peak Traffic Window</span>
            <MetricTooltip
              title="Peak Traffic Window"
              formula="argMax_h(hourlyEvents[h])"
              description="Critical hour with maximum concurrent visitor requests requiring compute capacity."
            />
          </div>
          <b className="kpi-metric-val">{peakHourStr}:00 UTC</b>
          <span className="kpi-meta-sub">{fmt(peakEvents)} hourly clicks</span>
        </div>
      </div>

      {/* Scaling Recommendation Alert */}
      <div className="insight-card" role="region" aria-label="YARN Scaling Recommendation">
        <div className="insight-icon" aria-hidden="true">⚡</div>
        <p className="insight-text">
          Click volume crests at <strong>{peakHourStr}:00 UTC</strong> with <strong>{fmt(peakEvents)} events</strong>.
          Scale out YARN NodeManager containers before <strong>{scaleOutHour}:00 UTC</strong> to guarantee sub-second latency.
        </p>
      </div>

      {/* 24-Hour Traffic Line / Area Chart */}
      <div className="panel wide">
        <div className="panel-title-row">
          <div>
            <h3>24-Hour Traffic Distribution</h3>
            <p className="sub">Hourly event volume calculated from ISO timestamps via Python mapper.</p>
          </div>
          <SourceBadge source={hourlyData?.source || 'hadoop'} />
        </div>

        <div className="chart" style={{ height: '340px', width: '100%', minHeight: '340px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={hourlyData?.hourly || []}
              margin={{ left: 14, right: 20, top: 16, bottom: 6 }}
            >
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a6f97" stopOpacity="0.55" />
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
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  color: '#ffffff'
                }}
              />
              <Area
                type="monotone"
                dataKey="events"
                name="Hourly Events"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fill="url(#trafficGradient)"
              />
              <ReferenceDot
                x={peakHour}
                y={peakEvents}
                r={7}
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel Section */}
      <div className="panel wide">
        <div className="panel-title-row">
          <div>
            <h3>E-Commerce Conversion Funnel & Drop-Off Analysis</h3>
            <p className="sub">
              Tracking journey loss from initial search query to finalized checkout payment.
            </p>
          </div>
          <SourceBadge source={funnelData?.source || 'hadoop'} />
        </div>

        <div className="funnel-pipeline-grid">
          {funnel.map((step, idx) => {
            const pctOfTotal = totalEvents > 0 ? (step.count / totalEvents) * 100 : 0;
            return (
              <div key={step.stage} className="funnel-step-box">
                <div className="funnel-step-header">
                  <span className="step-tag">STAGE {idx + 1}</span>
                  <span className="step-name">{step.stage}</span>
                </div>
                <div className="funnel-step-val">{fmt(step.count)}</div>
                <div className="funnel-step-pct">{pctOfTotal.toFixed(1)}% of all traffic</div>

                {step.dropOff > 0 && (
                  <div className="funnel-drop-badge">
                    <span>- {fmt(step.dropOff)} dropped ({step.dropOffRate}%)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
