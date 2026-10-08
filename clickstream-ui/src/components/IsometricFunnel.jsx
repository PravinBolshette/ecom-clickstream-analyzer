import React, { useState } from 'react';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

/**
 * Pure-CSS Layered Isometric Funnel View
 *
 * Rules respected:
 * - NO backdrop-filter, filter, overflow:hidden or opacity<1 on preserve-3d element.
 * - Layered platforms in 3D space with depth shadows and readable billboard labels.
 * - Interactive Flat View toggle.
 */
export default function IsometricFunnel({ stages = [], totalEvents = 2000000 }) {
  const [isIsometric, setIsIsometric] = useState(true);

  const STAGE_CONFIGS = [
    { key: 'SEARCH', label: '1. Search Intent', z: 120, color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
    { key: 'VIEW', label: '2. Product Discovery', z: 80, color: '#0284c7', glow: 'rgba(2, 132, 199, 0.4)' },
    { key: 'ADD_TO_CART', label: '3. Cart Commitment', z: 40, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    { key: 'PURCHASE', label: '4. Order Finalization', z: 0, color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' }
  ];

  return (
    <div className="isometric-funnel-container">
      {/* View Toggle Bar */}
      <div className="iso-controls-bar">
        <span className="iso-mode-indicator">
          Display Mode: <strong>{isIsometric ? 'Pure-CSS Isometric 3D Stack' : '2D Planar Flat View'}</strong>
        </span>
        <button
          type="button"
          onClick={() => setIsIsometric(!isIsometric)}
          className={`iso-toggle-btn ${isIsometric ? 'active' : ''}`}
          aria-pressed={isIsometric}
        >
          {isIsometric ? 'Switch to Flat View' : 'Switch to Isometric 3D'}
        </button>
      </div>

      {/* 3D Scene Viewport */}
      <div className={`iso-viewport ${isIsometric ? 'mode-isometric' : 'mode-flat'}`}>
        <div className="iso-scene">
          {STAGE_CONFIGS.map((cfg) => {
            const found = stages.find((s) => s.stage === cfg.key) || { count: 0, dropOff: 0, dropOffRate: 0 };
            const pct = totalEvents > 0 ? (found.count / totalEvents) * 100 : 0;

            return (
              <div
                key={cfg.key}
                className="iso-plane-layer"
                style={{
                  '--layer-z': `${cfg.z}px`,
                  '--accent-color': cfg.color,
                  '--accent-glow': cfg.glow
                }}
              >
                {/* Visual Glass Platform */}
                <div className="iso-plane-surface">
                  <div className="iso-surface-header">
                    <span className="iso-stage-tag" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="iso-pct-tag font-mono">
                      {pct.toFixed(1)}% volume
                    </span>
                  </div>

                  <div className="iso-surface-body">
                    <span className="iso-metric-count font-mono">{fmt(found.count)}</span>
                    <span className="iso-metric-sub">Processed Events</span>
                  </div>

                  {found.dropOff > 0 && (
                    <div className="iso-drop-pill">
                      <span>Drop: -{fmt(found.dropOff)} ({found.dropOffRate}%)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
