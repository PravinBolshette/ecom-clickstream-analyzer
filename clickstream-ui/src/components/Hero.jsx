import React, { lazy, Suspense, useState } from 'react';
import HeroFallback from './HeroFallback.jsx';

// ── CONFIGURATION CONSTANT ───────────────────────────────────────────────────
// If an MP4 video is later added to public/hero.mp4, toggle this constant to true.
export const USE_VIDEO_HERO = false;
export const HERO_VIDEO_SRC = '/hero.mp4';
export const HERO_POSTER_SRC = '/hero-poster.svg';

// Lazy-load the Three.js 3D scene to ensure code splitting into a separate chunk
const HeroScene3D = lazy(() => import('./HeroScene3D.jsx'));

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

function checkWebGLSupport() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export default function Hero({
  views = 802574,
  carts = 360035,
  purchases = 138275,
  conversion = 17.23,
  abandonment = 61.59,
  peakHour = 10,
}) {
  // Initialize state directly with lazy initializer to avoid set-state-in-effect
  const [webglAvailable] = useState(() => checkWebGLSupport());

  const per100 = views > 0 ? (purchases / views) * 100 : 17.2;
  const totalEvents = views + carts + purchases;

  return (
    <section className="hero-section" aria-label="Interactive 3D Funnel Flow">
      {/* Background 3D Scene / Video / SVG Fallback */}
      <div className="hero-viewport">
        {USE_VIDEO_HERO ? (
          <div className="hero-video-wrapper">
            <video
              className="hero-video"
              src={HERO_VIDEO_SRC}
              poster={HERO_POSTER_SRC}
              autoPlay
              muted
              loop
              playsInline
              aria-label="E-commerce clickstream funnel particle simulation"
            />
          </div>
        ) : webglAvailable ? (
          <Suspense fallback={<HeroFallback views={views} carts={carts} purchases={purchases} />}>
            <HeroScene3D views={views} carts={carts} purchases={purchases} />
          </Suspense>
        ) : (
          <HeroFallback views={views} carts={carts} purchases={purchases} />
        )}
      </div>

      {/* High-Contrast Foreground Overlay */}
      <div className="hero-overlay">
        <div className="hero-overlay-content">
          <div className="hero-tag-badge">
            <span className="live-dot" aria-hidden="true" />
            <span>MapReduce Streaming Telemetry</span>
          </div>

          <h1 className="hero-headline">
            Of every 100 product views, {per100.toFixed(1)} end in a purchase.
          </h1>

          <p className="hero-subhead">
            {abandonment.toFixed(0)}% of shoppers who add to cart leave without paying. Traffic peaks at{' '}
            <strong>{String(peakHour).padStart(2, '0')}:00 UTC</strong>, the critical hour to scale out YARN containers.
          </p>

          <div className="hero-kpis-grid" role="region" aria-label="Key Performance Indicators">
            <div className="hero-kpi-card kpi-view">
              <span className="kpi-label">Conversion Rate</span>
              <b className="kpi-val">{conversion.toFixed(2)}%</b>
              <span className="kpi-sub">{fmt(purchases)} buyers</span>
            </div>

            <div className="hero-kpi-card kpi-cart">
              <span className="kpi-label">Cart Abandonment</span>
              <b className="kpi-val">{abandonment.toFixed(1)}%</b>
              <span className="kpi-sub">{fmt(carts - purchases)} dropped</span>
            </div>

            <div className="hero-kpi-card kpi-buy">
              <span className="kpi-label">Events Processed</span>
              <b className="kpi-val">{fmt(totalEvents)}</b>
              <span className="kpi-sub">Across 11 HDFS blocks</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
