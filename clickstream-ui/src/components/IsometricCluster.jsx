import React, { useState } from 'react';

/**
 * Pure-CSS Layered Isometric Cluster Health Stack
 *
 * Stack Layers:
 * - Layer 3 (Top, Z=140px): NameNode (Master HDFS Metadata & Inodes)
 * - Layer 2 (Mid, Z=70px): YARN Compute (ResourceManager & NodeManager Containers)
 * - Layer 1 (Base, Z=0px): DataNodes (Worker Storage: 11 Replicas on datanode1 & datanode2)
 *
 * Adheres strictly to preserve-3d nesting rules (no filters/backdrop-filter on 3D root).
 */
export default function IsometricCluster({ cluster = {}, simulatedDown = false }) {
  const [isIsometric, setIsIsometric] = useState(true);

  const isSimulated = cluster.status === 'SIMULATED' || !cluster.live || cluster.source === 'simulated';

  return (
    <div className="isometric-cluster-container">
      {/* Controls Bar */}
      <div className="iso-controls-bar">
        <div className="flex-row items-center gap-2">
          <span className="iso-mode-indicator">
            Topology View: <strong>{isIsometric ? '3D Isometric Tier Stack' : '2D Planar Architecture'}</strong>
          </span>
          {isSimulated && (
            <span className="source-badge badge-simulated">
              SIMULATED TELEMETRY
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsIsometric(!isIsometric)}
          className={`iso-toggle-btn ${isIsometric ? 'active' : ''}`}
          aria-pressed={isIsometric}
        >
          {isIsometric ? 'Switch to Flat View' : 'Switch to 3D Isometric View'}
        </button>
      </div>

      {/* 3D Viewport with preserve-3d scene */}
      <div className={`iso-cluster-viewport ${isIsometric ? 'mode-isometric' : 'mode-flat'}`}>
        <div className="iso-cluster-scene">
          {/* Layer 3: Master Control Tier (NameNode) */}
          <div className="cluster-stack-layer layer-master" style={{ '--layer-z': '140px' }}>
            <div className="cluster-layer-surface">
              <div className="cluster-layer-badge badge-tier-master">
                TIER 1: MASTER METADATA
              </div>
              <div className="cluster-node-content">
                <div className="node-head">
                  <span className="node-status-dot dot-green" aria-hidden="true" />
                  <strong>NameNode Master Container</strong>
                </div>
                <div className="node-meta font-mono">172.19.0.2:9000 & 9870</div>
                <div className="node-details">
                  FSState: Active | Inode Blocks Tracked: 11 | SafeMode: OFF
                </div>
              </div>
            </div>
          </div>

          {/* Layer 2: Distributed Compute Tier (YARN) */}
          <div className="cluster-stack-layer layer-compute" style={{ '--layer-z': '70px' }}>
            <div className="cluster-layer-surface">
              <div className="cluster-layer-badge badge-tier-compute">
                TIER 2: YARN DISTRIBUTED COMPUTE
              </div>
              <div className="cluster-node-content">
                <div className="node-head">
                  <span className="node-status-dot dot-green" aria-hidden="true" />
                  <strong>ResourceManager & NodeManager</strong>
                </div>
                <div className="node-meta font-mono">172.19.0.5:8088 | NodeManagers: 1</div>
                <div className="node-details">
                  Data Locality: 100% On-Node | Containers: 11 Map Tasks Scheduled
                </div>
              </div>
            </div>
          </div>

          {/* Layer 1: Distributed Storage Tier (DataNodes) */}
          <div className="cluster-stack-layer layer-storage" style={{ '--layer-z': '0px' }}>
            <div className="cluster-layer-surface">
              <div className="cluster-layer-badge badge-tier-storage">
                TIER 3: HDFS DISTRIBUTED STORAGE (REPLICATION FACTOR 2)
              </div>
              <div className="cluster-datanodes-row">
                {/* DataNode 1 */}
                <div className="dn-item healthy">
                  <div className="node-head">
                    <span className="node-status-dot dot-green" aria-hidden="true" />
                    <strong>datanode1 (Worker)</strong>
                  </div>
                  <div className="node-meta font-mono">172.19.0.4:9866</div>
                  <div className="node-desc">
                    11 / 11 Replicas Healthy (162.7 MB)
                  </div>
                </div>

                {/* DataNode 2 */}
                <div className={`dn-item ${simulatedDown ? 'dead' : 'healthy'}`}>
                  <div className="node-head">
                    <span className={`node-status-dot ${simulatedDown ? 'dot-red' : 'dot-green'}`} aria-hidden="true" />
                    <strong>datanode2 (Worker)</strong>
                  </div>
                  <div className="node-meta font-mono">172.19.0.3:9866</div>
                  <div className="node-desc">
                    {simulatedDown
                      ? 'OFFLINE (Simulated fault active)'
                      : '11 / 11 Replicas Healthy (162.7 MB)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
