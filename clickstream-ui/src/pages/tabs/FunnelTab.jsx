const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

export default function FunnelTab({ views = 802574, carts = 360035, purchases = 138275, conversion = 17.23, abandonment = 61.59 }) {
  const W = 900, mid = 120, H = 200, xs = [30, 430, 830];
  const hs = [H, Math.max((H * carts) / (views || 1), 14), Math.max((H * purchases) / (views || 1), 10)];
  const labels = [
    ['Product Views', views],
    ['Added to Cart', carts],
    ['Completed Purchases', purchases],
  ];

  const band = (i, fill) => {
    const x1 = xs[i] + 14, x2 = xs[i + 1], a = hs[i] / 2, b = hs[i + 1] / 2, m = (x1 + x2) / 2;
    return (
      <path
        key={i}
        fill={fill}
        d={`M${x1},${mid - a} C${m},${mid - a} ${m},${mid - b} ${x2},${mid - b} L${x2},${mid + b} C${m},${mid + b} ${m},${mid + a} ${x1},${mid + a}Z`}
      />
    );
  };

  const droppedBeforeCart = views - carts;
  const droppedAtCheckout = carts - purchases;

  return (
    <div className="tab-pane" role="tabpanel" id="tab-funnel" aria-labelledby="tab-link-funnel">
      <div className="tab-header">
        <div>
          <h2>E-Commerce Conversion Funnel</h2>
          <p className="sub">Curved river diagram tracking visitor drop-off across 2,000,000 processed clickstream events.</p>
        </div>
      </div>

      <div className="panel wide">
        <svg viewBox={`0 0 ${W} 270`} role="img" aria-label="Funnel from views to carts to purchases" className="funnel">
          {band(0, 'var(--view-soft)')}
          {band(1, 'var(--cart-soft)')}
          {xs.map((x, i) => (
            <rect
              key={i}
              x={x}
              y={mid - hs[i] / 2}
              width="14"
              height={hs[i]}
              rx="3"
              fill={['var(--view)', 'var(--cart)', 'var(--buy)'][i]}
            />
          ))}

          <text x={(xs[0] + xs[1]) / 2} y={mid - 10} className="drop">
            {fmt(droppedBeforeCart)} left before cart
          </text>
          <text x={(xs[0] + xs[1]) / 2} y={mid + 12} className="drop-sub">
            ({((droppedBeforeCart / (views || 1)) * 100).toFixed(1)}% bounce)
          </text>

          <text x={(xs[1] + xs[2]) / 2} y={mid - 10} className="drop">
            {fmt(droppedAtCheckout)} left at checkout
          </text>
          <text x={(xs[1] + xs[2]) / 2} y={mid + 12} className="drop-sub">
            ({abandonment.toFixed(1)}% abandonment)
          </text>

          {labels.map(([t, v], i) => (
            <g key={t} transform={`translate(${xs[i] - (i === 2 ? 110 : 0)},236)`}>
              <text className="stage-n">{fmt(v)}</text>
              <text y="20" className="stage-t">{t}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="kpis">
        <div className="kpi-block kpi-view">
          <span>Overall Conversion Rate</span>
          <b>{conversion.toFixed(2)}%</b>
          <p className="kpi-sub">Views converting into purchases</p>
        </div>
        <div className="kpi-block kpi-cart">
          <span>Cart Abandonment Rate</span>
          <b>{abandonment.toFixed(1)}%</b>
          <p className="kpi-sub">Carts abandoned before checkout</p>
        </div>
        <div className="kpi-block kpi-buy">
          <span>Total Funnel Events</span>
          <b>{fmt(views + carts + purchases)}</b>
          <p className="kpi-sub">Aggregated via Python Reducer</p>
        </div>
      </div>
    </div>
  );
}
