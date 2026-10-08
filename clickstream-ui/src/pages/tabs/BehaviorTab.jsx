import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { fetchDevices, fetchLocations } from '../../services/api.js';
import SourceBadge from '../../components/SourceBadge.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState.jsx';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

// Palette for Devices
const DEVICE_COLORS = {
  Mobile: '#38bdf8',
  Desktop: '#818cf8',
  Tablet: '#f472b6'
};

export default function BehaviorTab() {
  const [deviceData, setDeviceData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchDevices(), fetchLocations()])
      .then(([dRes, lRes]) => {
        setDeviceData(dRes);
        setLocationData(lRes);
      })
      .catch((err) => {
        setError(err.message || 'Error loading behavioral telemetry');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([fetchDevices(), fetchLocations()])
      .then(([dRes, lRes]) => {
        if (!ignore) {
          setDeviceData(dRes);
          setLocationData(lRes);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Error loading behavioral telemetry');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-behavior" aria-labelledby="tab-link-behavior">
        <LoadingSkeleton height={360} lines={6} />
      </div>
    );
  }

  if (error || !deviceData || !locationData) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-behavior" aria-labelledby="tab-link-behavior">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  const devices = deviceData.devices || [];
  const locations = locationData.locations || [];

  const totalDeviceViews = devices.reduce((sum, d) => sum + (d.views || 0), 0);

  return (
    <div className="tab-pane" role="tabpanel" id="tab-behavior" aria-labelledby="tab-link-behavior">
      {/* Header */}
      <div className="tab-header flex-between">
        <div>
          <h2>User Behavior & Geographic Distribution</h2>
          <p className="sub">
            Telemetry split across access devices (Mobile, Desktop, Tablet) and top 5 Indian metropolitan hubs.
          </p>
        </div>
        <SourceBadge source={deviceData.source} />
      </div>

      {/* Two Column Grid for Devices & Locations */}
      <div className="behavior-grid">
        {/* Device Split Donut Chart */}
        <div className="panel">
          <div className="panel-title-row">
            <div>
              <h3>Device Share & Conversion</h3>
              <p className="sub">Traffic split and order conversion per platform.</p>
            </div>
            <SourceBadge source={deviceData.source} />
          </div>

          <div className="chart" style={{ height: '300px', width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={devices}
                  dataKey="views"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                >
                  {devices.map((entry) => (
                    <Cell
                      key={entry.device}
                      fill={DEVICE_COLORS[entry.device] || '#38bdf8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [
                    `${fmt(v)} views (${((v / totalDeviceViews) * 100).toFixed(1)}%)`,
                    name
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    color: '#ffffff'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="device-stats-list">
            {devices.map((d) => (
              <div key={d.device} className="device-stat-row">
                <div className="flex-row items-center gap-2">
                  <span
                    className="legend-color-dot"
                    style={{ background: DEVICE_COLORS[d.device] || '#38bdf8' }}
                  />
                  <span className="font-semibold">{d.device}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono">{fmt(d.views)} views</span>
                  <span className="conv-tag text-emerald font-bold ml-2">
                    {d.conversionRate.toFixed(2)}% conv
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution Across 5 Metros */}
        <div className="panel">
          <div className="panel-title-row">
            <div>
              <h3>Top 5 Metros Traffic & Orders</h3>
              <p className="sub">Volume ranking across Pune, Mumbai, Delhi, Bangalore, Hyderabad.</p>
            </div>
            <SourceBadge source={locationData.source} />
          </div>

          <div className="chart" style={{ height: '300px', width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={locations}
                layout="vertical"
                margin={{ left: 16, right: 24, top: 12, bottom: 8 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="city"
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ink)', fontWeight: 600, fontSize: 13 }}
                />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name]}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    color: '#ffffff'
                  }}
                />
                <Bar dataKey="views" name="Views" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="metro-rankings-list">
            {locations.map((loc, idx) => (
              <div key={loc.city} className="metro-stat-row">
                <span className="metro-rank">#{idx + 1} {loc.city}</span>
                <span className="font-mono text-muted">{fmt(loc.views)} views</span>
                <span className="font-mono text-emerald font-semibold">{fmt(loc.purchases)} orders</span>
                <span className="font-mono font-bold">{loc.conversionRate.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
