import React from 'react';

/**
 * Renders an explicit, high-contrast badge indicating whether data is from
 * real Hadoop MapReduce processing, deterministic fallback demo data, or simulated cluster.
 */
export default function SourceBadge({ source = 'hadoop', status = null }) {
  if (status === 'SIMULATED' || source === 'simulated') {
    return (
      <span
        className="source-badge badge-simulated"
        title="Simulated cluster telemetry fallback: live NameNode RPC not reachable."
        aria-label="Cluster Status: Simulated"
      >
        <span className="badge-dot dot-amber" aria-hidden="true" />
        SIMULATED
      </span>
    );
  }

  if (source === 'demo') {
    return (
      <span
        className="source-badge badge-demo"
        title="Deterministic demo data: awaiting MapReduce multi-dimension keys from Hadoop."
        aria-label="Data Source: Demo Data"
      >
        <span className="badge-dot dot-orange" aria-hidden="true" />
        DEMO DATA
      </span>
    );
  }

  return (
    <span
      className="source-badge badge-hadoop"
      title="Live telemetry processed via Hadoop Streaming MapReduce in part-00000."
      aria-label="Data Source: Hadoop Telemetry"
    >
      <span className="badge-dot dot-green" aria-hidden="true" />
      HADOOP REAL
    </span>
  );
}
