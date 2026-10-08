import React, { useState } from 'react';

/**
 * Interactive info indicator displaying metric mathematical formulations and explanations.
 */
export default function MetricTooltip({ title, formula, description }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="metric-tooltip-wrapper"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      role="button"
      aria-label={`Formula details for ${title}`}
    >
      <span className="tooltip-icon" aria-hidden="true">ⓘ</span>
      {open && (
        <span className="tooltip-popover" role="tooltip">
          <strong className="tooltip-title">{title}</strong>
          {formula && <code className="tooltip-formula">{formula}</code>}
          {description && <span className="tooltip-desc">{description}</span>}
        </span>
      )}
    </span>
  );
}
