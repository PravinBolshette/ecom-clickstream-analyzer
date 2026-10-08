import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { fetchCategories } from '../../services/api.js';
import SourceBadge from '../../components/SourceBadge.jsx';
import MetricTooltip from '../../components/MetricTooltip.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import TiltCard from '../../components/TiltCard.jsx';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

export default function CategoriesTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortField, setSortField] = useState('views');
  const [sortAsc, setSortAsc] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchCategories()
      .then(setData)
      .catch((err) => setError(err.message || 'Error fetching category data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    fetchCategories()
      .then((res) => {
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Error fetching category data');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered categories for charts & matrix
  const filteredCategories = useMemo(() => {
    const list = data?.categories || [];
    if (selectedCategory === 'All') return list;
    return list.filter((c) => c.category === selectedCategory);
  }, [data, selectedCategory]);

  // Sorted categories for table
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredCategories, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (loading) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-categories" aria-labelledby="tab-link-categories">
        <LoadingSkeleton height={360} lines={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-categories" aria-labelledby="tab-link-categories">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="tab-pane" role="tabpanel" id="tab-categories" aria-labelledby="tab-link-categories">
      {/* Header */}
      <div className="tab-header flex-between">
        <div>
          <h2>Category Performance Matrix</h2>
          <p className="sub">
            Side-by-side comparative views, cart additions, and order conversion across all 5 merchandise categories.
          </p>
        </div>
        <SourceBadge source={data.source} />
      </div>

      {/* Filter Selector Bar */}
      <div className="filters-bar panel">
        <div className="filter-group">
          <label htmlFor="cat-selector" className="filter-label">Filter Category Scope:</label>
          <div className="pill-selector" id="cat-selector" role="radiogroup">
            {['All', 'Electronics', 'Fashion', 'Home', 'Sports', 'Books'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                role="radio"
                aria-checked={selectedCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped Bar Chart wrapped in TiltCard (+/-4deg) */}
      <TiltCard maxTilt={4} className="panel wide">
        <div className="panel-title-row">
          <div>
            <h3>Discovery, Intent & Checkout Volumes</h3>
            <p className="sub">Comparing Product Views vs Added to Cart vs Final Purchases.</p>
          </div>
        </div>

        <div className="chart" style={{ height: '360px', width: '100%', minHeight: '360px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredCategories}
              margin={{ left: 16, right: 24, top: 18, bottom: 8 }}
            >
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ink)', fontWeight: 600, fontSize: 13 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
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
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="views" name="Product Views" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cartAdds" name="Cart Adds" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TiltCard>

      {/* Sortable Category Performance Matrix Table */}
      <div className="panel wide">
        <div className="panel-title-row">
          <div>
            <h3>Category Conversion Benchmarks</h3>
            <p className="sub">Click any header column to sort and inspect funnel efficiency ratios.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="enterprise-table" aria-label="Category performance metrics table">
            <thead>
              <tr>
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
                <th onClick={() => handleSort('viewToCartRate')} className="sortable-th text-right">
                  View → Cart % {sortField === 'viewToCartRate' ? (sortAsc ? '▲' : '▼') : ''}
                  <MetricTooltip
                    title="View to Cart Rate"
                    formula="(cartAdds / views) * 100"
                    description="Proportion of product views that resulted in an item added to cart."
                  />
                </th>
                <th onClick={() => handleSort('cartToPurchaseRate')} className="sortable-th text-right">
                  Cart → Purchase % {sortField === 'cartToPurchaseRate' ? (sortAsc ? '▲' : '▼') : ''}
                  <MetricTooltip
                    title="Cart to Purchase Rate"
                    formula="(purchases / cartAdds) * 100"
                    description="Checkout completion rate of items that made it to cart."
                  />
                </th>
                <th onClick={() => handleSort('conversionRate')} className="sortable-th text-right">
                  Conversion Rate % {sortField === 'conversionRate' ? (sortAsc ? '▲' : '▼') : ''}
                  <MetricTooltip
                    title="Overall Conversion Rate"
                    formula="(purchases / views) * 100"
                    description="Total purchase orders finalized divided by total views."
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((c) => (
                <tr key={c.category}>
                  <td className="font-semibold">{c.category}</td>
                  <td className="text-right font-mono">{fmt(c.views)}</td>
                  <td className="text-right font-mono">{fmt(c.cartAdds)}</td>
                  <td className="text-right font-mono">{fmt(c.purchases)}</td>
                  <td className="text-right font-mono">{c.viewToCartRate.toFixed(2)}%</td>
                  <td className="text-right font-mono">{c.cartToPurchaseRate.toFixed(2)}%</td>
                  <td className="text-right font-mono font-bold text-emerald">
                    {c.conversionRate.toFixed(2)}%
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
