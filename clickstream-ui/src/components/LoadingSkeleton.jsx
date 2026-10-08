import React from 'react';

export default function LoadingSkeleton({ lines = 4, height = 220 }) {
  return (
    <div className="skeleton-container" style={{ minHeight: `${height}px` }} aria-busy="true" aria-label="Loading content">
      <div className="skeleton-pulse skeleton-header" />
      <div className="skeleton-body">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-pulse skeleton-row"
            style={{ width: `${90 - (i % 3) * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
