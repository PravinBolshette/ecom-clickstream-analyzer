import React, { useEffect, useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { fetchProducts } from '../../services/api.js';
import SourceBadge from '../../components/SourceBadge.jsx';
import MetricTooltip from '../../components/MetricTooltip.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState.jsx';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

export default function ProductsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [minViews, setMinViews] = useState(50);
  const [viewPctl, setViewPctl] = useState(75);
  const [convPctl, setConvPctl] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Table Sorting
  const [sortField, setSortField] = useState('views');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetchProducts({
      category: categoryFilter,
      minViews,
      viewPctl,
      convPctl
    })
      .then((res) => {
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Error loading product metrics');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [categoryFilter, minViews, viewPctl, convPctl, reloadKey]);

  // Filter by search query
  const searchedProducts = useMemo(() => {
    const list = data?.products || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (p) => p.id.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Sort products for table
  const sortedProducts = useMemo(() => {
    return [...searchedProducts].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });
  }, [searchedProducts, sortField, sortAsc]);

  // High Interest, Low Conversion Friction Products
  const frictionProducts = useMemo(() => {
    const list = data?.products || [];
    return list.filter((p) => p.frictionFlag);
  }, [data]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-products" aria-labelledby="tab-link-products">
        <LoadingSkeleton height={380} lines={7} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-products" aria-labelledby="tab-link-products">
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    );
  }

  const thresholds = data?.thresholds || {
    p75Views: 16165,
    p25ConversionRate: 16.92
  };

  return (
    <div className="tab-pane" role="tabpanel" id="tab-products" aria-labelledby="tab-link-products">
      {/* Header */}
      <div className="tab-header flex-between">
        <div>
          <h2>Product Conversion & Friction Diagnostics</h2>
          <p className="sub">
            Pinpoint catalog items with high customer browsing traffic but abnormally low checkout conversion.
          </p>
        </div>
        <SourceBadge source={data?.source || 'hadoop'} />
      </div>

      {/* Interactive Controls Bar */}
      <div className="panel wide product-controls-panel">
        <div className="controls-grid">
          {/* Category Filter */}
          <div className="control-item">
            <label htmlFor="filter-cat">Category:</label>
            <select
              id="filter-cat"
              className="styled-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {['All', 'Electronics', 'Fashion', 'Home', 'Sports', 'Books'].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="control-item">
            <label htmlFor="search-input">Search Product:</label>
            <input
              id="search-input"
              type="text"
              placeholder="e.g. P1024"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="styled-input"
            />
          </div>

          {/* Min Views Threshold */}
          <div className="control-item">
            <label htmlFor="min-views">Min Views ({minViews}):</label>
            <input
              id="min-views"
              type="range"
              min="10"
              max="1000"
              step="10"
              value={minViews}
              onChange={(e) => setMinViews(Number(e.target.value))}
              className="styled-slider"
            />
          </div>

          {/* Views Percentile Threshold */}
          <div className="control-item">
            <label htmlFor="view-pctl">Views Percentile ({viewPctl}th):</label>
            <input
              id="view-pctl"
              type="range"
              min="50"
              max="95"
              step="5"
              value={viewPctl}
              onChange={(e) => setViewPctl(Number(e.target.value))}
              className="styled-slider"
            />
          </div>

          {/* Conv Percentile Threshold */}
          <div className="control-item">
            <label htmlFor="conv-pctl">Conv. Percentile ({convPctl}th):</label>
            <input
              id="conv-pctl"
              type="range"
              min="5"
              max="50"
              step="5"
              value={convPctl}
              onChange={(e) => setConvPctl(Number(e.target.value))}
              className="styled-slider"
            />
          </div>
        </div>

        {/* Dynamic Boundary Summary */}
        <div className="friction-threshold-summary">
          <span className="summary-pill">
            Calculated Friction Boundary: Views ≥ <b>{fmt(thresholds.p75Views)}</b> AND Conversion ≤ <b>{thresholds.p25ConversionRate}%</b>
          </span>
          <span className="summary-pill highlight">
            Flagged Products: <b>{frictionProducts.length}</b> / {rawProducts.length}
          </span>
        </div>
      </div>

      {/* Scatter Plot: Views vs Conversion Rate */}
      <div className="panel wide">
        <div className="panel-title-row">
          <div>
            <h3>Discovery Volume vs. Purchase Conversion</h3>
            <p className="sub">
              Scatter distribution of catalog products. Amber points denote high-interest friction bottlenecks.
            </p>
          </div>
          <div className="scatter-legend">
            <span className="legend-dot dot-cyan" /> Normal Product
            <span className="legend-dot dot-amber" /> Friction Product
          </div>
        </div>

        <div className="chart" style={{ height: '360px', width: '100%', minHeight: '360px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 24, bottom: 16, left: 14 }}>
              <XAxis
                type="number"
                dataKey="views"
                name="Views"
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="conversionRate"
                name="Conversion Rate"
                unit="%"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <ZAxis range={[70, 70]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="custom-chart-tooltip">
                      <div className="tooltip-head">
                        <strong>{d.id}</strong> ({d.category})
                      </div>
                      <div>Views: <b>{fmt(d.views)}</b></div>
                      <div>Purchases: <b>{fmt(d.purchases)}</b></div>
                      <div>Conversion: <b>{d.conversionRate.toFixed(2)}%</b></div>
                      {d.frictionFlag && (
                        <div className="tooltip-friction-badge">⚠️ Friction Product</div>
                      )}
                    </div>
                  );
                }}
              />
              <Scatter name="Catalog Items" data={rawProducts}>
                {rawProducts.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.frictionFlag ? '#f59e0b' : '#38bdf8'}
                    stroke={entry.frictionFlag ? '#b45309' : '#0284c7'}
                    strokeWidth={entry.frictionFlag ? 2 : 1}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High Interest, Low Conversion Friction Alert List */}
      <div className="panel wide friction-alert-section">
        <div className="panel-title-row">
          <div>
            <div className="flex-row gap-2 items-center">
              <span className="alert-badge">Price Sensitivity & Drop-Off Alert</span>
              <h3>High Interest, Low Conversion Friction List</h3>
            </div>
            <p className="sub">
              These catalog items generate top-tier search & browsing traffic but convert below the 25th percentile.
            </p>
          </div>
        </div>

        {frictionProducts.length === 0 ? (
          <div className="empty-friction-card">
            <p>No products exceed the current friction thresholds. Try lowering the Views Percentile slider.</p>
          </div>
        ) : (
          <div className="flagged-grid">
            {frictionProducts.map((p) => (
              <div key={p.id} className="flagged-card friction-card">
                <div className="flagged-card-top">
                  <span className="flagged-id">{p.id}</span>
                  <span className="flagged-cat-tag">{p.category}</span>
                  <span className="flagged-rate">{p.conversionRate.toFixed(2)}% conv.</span>
                </div>
                <div className="flagged-stats">
                  <div>
                    <span className="stat-label">Views</span>
                    <span className="stat-val">{fmt(p.views)}</span>
                  </div>
                  <div>
                    <span className="stat-label">Cart Adds</span>
                    <span className="stat-val">{fmt(p.cartAdds)}</span>
                  </div>
                  <div>
                    <span className="stat-label">Purchases</span>
                    <span className="stat-val">{fmt(p.purchases)}</span>
                  </div>
                </div>
                <p className="flagged-recommendation">
                  High discovery traffic ({fmt(p.views)} views) with lagging checkout. Recommend pricing discount A/B test or shipping incentive.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sortable Catalog Table */}
      <div className="panel wide">
        <div className="panel-title-row">
          <div>
            <h3>All Catalog Products ({sortedProducts.length})</h3>
            <p className="sub">Sortable multi-metric catalog table aggregated via Hadoop reducer.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="enterprise-table" aria-label="Product catalog metrics table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} className="sortable-th">
                  Product ID {sortField === 'id' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('category')} className="sortable-th">
                  Category {sortField === 'category' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('views')} className="sortable-th text-right">
                  Views {sortField === 'views' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('cartAdds')} className="sortable-th text-right">
                  Cart Adds {sortField === 'cartAdds' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('purchases')} className="sortable-th text-right">
                  Purchases {sortField === 'purchases' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('conversionRate')} className="sortable-th text-right">
                  Conversion Rate {sortField === 'conversionRate' ? (sortAsc ? '▲' : '▼') : ''}
                  <MetricTooltip
                    title="Conversion Rate"
                    formula="(purchases / views) * 100"
                    description="Order completion percentage for this catalog item."
                  />
                </th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((p) => (
                <tr key={p.id} className={p.frictionFlag ? 'row-friction' : ''}>
                  <td className="font-semibold font-mono">{p.id}</td>
                  <td>{p.category}</td>
                  <td className="text-right font-mono">{fmt(p.views)}</td>
                  <td className="text-right font-mono">{fmt(p.cartAdds)}</td>
                  <td className="text-right font-mono">{fmt(p.purchases)}</td>
                  <td className="text-right font-mono font-bold">
                    {p.conversionRate.toFixed(2)}%
                  </td>
                  <td className="text-center">
                    {p.frictionFlag ? (
                      <span className="friction-badge" title="High views, low conversion">
                        ⚠️ FRICTION
                      </span>
                    ) : (
                      <span className="healthy-badge">NORMAL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
