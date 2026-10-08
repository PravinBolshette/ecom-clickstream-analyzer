// SVG Fallback Funnel used when WebGL is unavailable or loading
export default function HeroFallback({ views = 802574, carts = 360035, purchases = 138275 }) {
  const per100 = views ? ((purchases / views) * 100).toFixed(1) : '17.2';

  return (
    <div className="hero-fallback-container" role="img" aria-label="Funnel Flow Diagram Fallback">
      <svg viewBox="0 0 800 360" className="hero-fallback-svg">
        <defs>
          <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a6f97" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2a6f97" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer Funnel Outline */}
        <polygon
          points="150,40 650,40 480,180 480,310 320,310 320,180"
          fill="#16222e"
          stroke="#233446"
          strokeWidth="2"
        />

        {/* View Flow (Top Section) */}
        <polygon
          points="170,55 630,55 530,140 270,140"
          fill="#2a6f97"
          opacity="0.85"
        />
        <text x="400" y="90" textAnchor="middle" fill="#bcd6e6" fontSize="14" fontWeight="600">
          STAGE 1: PRODUCT VIEWS ({views.toLocaleString('en-IN')})
        </text>

        {/* Cart Flow (Middle Section) */}
        <polygon
          points="276,146 524,146 450,220 350,220"
          fill="#e8a33d"
          opacity="0.9"
        />
        <text x="400" y="180" textAnchor="middle" fill="#16222e" fontSize="14" fontWeight="700">
          STAGE 2: CARTS ({carts.toLocaleString('en-IN')})
        </text>

        {/* Purchase Flow (Spout Section) */}
        <rect
          x="355"
          y="226"
          width="90"
          height="75"
          rx="4"
          fill="#1d7a5f"
        />
        <text x="400" y="265" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
          STAGE 3: BUY
        </text>
        <text x="400" y="284" textAnchor="middle" fill="#a3e0cb" fontSize="12" fontWeight="600">
          {purchases.toLocaleString('en-IN')}
        </text>

        {/* Dropoff labels */}
        <text x="660" y="100" fill="#c4453c" fontSize="13" fontWeight="600">
          ← Drop-off before cart
        </text>
        <text x="540" y="185" fill="#c4453c" fontSize="13" fontWeight="600">
          ← Cart abandonment
        </text>
      </svg>
      <div className="fallback-caption">
        <span>3D Scene Fallback: WebGL unavailable or prefers reduced motion. Conversion: {per100} per 100 views.</span>
      </div>
    </div>
  );
}
