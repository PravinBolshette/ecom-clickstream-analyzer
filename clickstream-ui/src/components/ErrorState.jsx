import React from 'react';

export default function ErrorState({ message = 'Failed to load telemetry data.', onRetry }) {
  return (
    <div className="error-state-card" role="alert">
      <div className="error-icon">⚠️</div>
      <h3>API Communication Error</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="retry-btn">
          Retry Fetch
        </button>
      )}
    </div>
  );
}
