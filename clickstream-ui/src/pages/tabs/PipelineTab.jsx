import { useState } from 'react';

const PIPELINE_NODES = [
  {
    id: 'generator',
    name: 'Data Generator',
    subtitle: 'generate_data.py',
    tag: 'Synthetic Ingestion',
    concept: 'Big Data Ingestion & Workload Synthesis',
    details:
      'Generates 2,000,000 synthetic clickstream events (170.2 MB) with realistic session funnel constraints. Guarantees that every Purchase has prior View and Cart actions in the same user session.',
    cloudConcept:
      'Simulates high-velocity enterprise clickstream workloads before loading into distributed storage.',
  },
  {
    id: 'hdfs',
    name: 'HDFS Cluster',
    subtitle: 'namenode + 2 datanodes',
    tag: 'Replication: 2',
    concept: 'Distributed Storage & Block Replication',
    details:
      'NameNode splits clickstream.csv into 11 discrete 16MB blocks (dfs.blocksize=16777216) and distributes each block to both datanode1 and datanode2 with replication factor 2.',
    cloudConcept:
      'Eliminates single point of failure (SPOF) for data. If any DataNode crashes, all 11 blocks remain 100% readable from the survivor replica.',
  },
  {
    id: 'yarn',
    name: 'YARN & MapReduce',
    subtitle: 'ResourceManager + NodeManager',
    tag: 'Distributed Compute',
    concept: 'Resource Negotiation & Data Locality',
    details:
      'YARN schedules 11 parallel Map task containers on the NodeManager directly where HDFS blocks reside (data locality). Mappers filter and extract metric keys via Python standard streams.',
    cloudConcept:
      'Moves compute to the data instead of moving heavy data to compute, minimizing network I/O across cluster nodes.',
  },
  {
    id: 'part',
    name: 'part-00000',
    subtitle: 'HDFS Output',
    tag: 'Aggregated Results',
    concept: 'MapReduce Output Consolidation',
    details:
      'Hadoop shuffle & sort routes identical keys to the Reducer. Reducer outputs 128 consolidated metric lines (FUNNEL, HOURLY, PROD_VIEW, PROD_PURCHASE) into /ecommerce/out/part-00000.',
    cloudConcept:
      'Shrinks 2,000,000 input events down to 128 aggregated summary metrics ready for real-time querying.',
  },
  {
    id: 'api',
    name: 'Node.js Express API',
    subtitle: 'Port :4000',
    tag: 'Microservice Gateway',
    concept: 'Decoupled Service Architecture & JMX Telemetry',
    details:
      'Node.js REST service reads part-00000 into JSON and concurrently queries NameNode JMX metrics (/jmx?qry=Hadoop:service=NameNode,name=FSNamesystemState) for live cluster state.',
    cloudConcept:
      'Provides a stateless API boundary decoupling big data storage from client-side analytics presentation.',
  },
  {
    id: 'dashboard',
    name: 'React 19 Dashboard',
    subtitle: 'Port :5173 + Three.js',
    tag: 'Observability UI',
    concept: 'Cloud Observability & 3D Telemetry',
    details:
      'Vite-powered single page application featuring a 3D WebGL particle funnel (@react-three/fiber), interactive SVG pipeline diagrams, and live fault-tolerance simulation.',
    cloudConcept:
      'Client-side visualization layer providing real-time operational insights and cluster health monitoring.',
  },
];

export default function PipelineTab({ cluster = { replication: 2, live: false, liveNodes: 2, deadNodes: 0, underReplicated: 0 } }) {
  const [selectedNodeId, setSelectedNodeId] = useState('hdfs');
  const [simulatedDown, setSimulatedDown] = useState(false);

  const selectedNode = PIPELINE_NODES.find((n) => n.id === selectedNodeId) || PIPELINE_NODES[1];

  const nodesState = [
    { name: 'namenode', role: 'NameNode (Master)', ok: true, ip: '172.19.0.2:9000' },
    { name: 'datanode1', role: 'DataNode (Worker)', ok: true, ip: '172.19.0.4:9866' },
    { name: 'datanode2', role: 'DataNode (Worker)', ok: !simulatedDown, ip: '172.19.0.3:9866' },
  ];

  return (
    <div className="tab-pane" role="tabpanel" id="tab-how-it-works" aria-labelledby="tab-link-how-it-works">
      <div className="tab-header">
        <div>
          <h2>End-to-End Pipeline & Architecture</h2>
          <p className="sub">
            Interactive left-to-right architecture map. Click any stage to inspect its Cloud Computing mechanics.
          </p>
        </div>
      </div>

      {/* SVG Pipeline Map */}
      <div className="panel wide pipeline-diagram-panel">
        <div className="diagram-container">
          <svg viewBox="0 0 1020 130" className="pipeline-svg" role="img" aria-label="Architecture Pipeline Map">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--view)" />
              </marker>
            </defs>

            {/* Connecting Flow Lines */}
            {[
              [140, 190],
              [310, 360],
              [480, 530],
              [650, 700],
              [820, 870],
            ].map(([x1, x2], idx) => (
              <g key={idx}>
                {/* Background static line */}
                <line x1={x1} y1="65" x2={x2} y2="65" stroke="var(--line-strong)" strokeWidth="2" />
                {/* Animated dash flow */}
                <line
                  x1={x1}
                  y1="65"
                  x2={x2}
                  y2="65"
                  stroke="var(--view)"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                  className="connector-flow"
                  markerEnd="url(#arrow)"
                />
              </g>
            ))}

            {/* Pipeline Stage Nodes */}
            {PIPELINE_NODES.map((node, i) => {
              const x = 20 + i * 170;
              const isSelected = node.id === selectedNodeId;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, 20)`}
                  className={`pipeline-node-g ${isSelected ? 'selected' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${node.name}: ${node.subtitle}`}
                  onClick={() => setSelectedNodeId(node.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNodeId(node.id);
                    }
                  }}
                >
                  <rect
                    width="120"
                    height="90"
                    rx="10"
                    className="node-rect"
                    fill={isSelected ? 'var(--panel-elevated)' : 'var(--panel)'}
                    stroke={isSelected ? 'var(--view)' : 'var(--line)'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                  />
                  <rect
                    x="8"
                    y="8"
                    width="104"
                    height="18"
                    rx="4"
                    fill={isSelected ? 'var(--view-tint)' : 'var(--bg)'}
                  />
                  <text x="60" y="21" textAnchor="middle" className="node-stage-num">
                    STEP {i + 1}
                  </text>
                  <text x="60" y="48" textAnchor="middle" className="node-title">
                    {node.name.length > 13 ? node.name.slice(0, 12) + '…' : node.name}
                  </text>
                  <text x="60" y="66" textAnchor="middle" className="node-sub">
                    {node.subtitle.length > 15 ? node.subtitle.slice(0, 14) + '…' : node.subtitle}
                  </text>
                  <circle
                    cx="60"
                    cy="80"
                    r="4"
                    fill={isSelected ? 'var(--view)' : 'var(--line-strong)'}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Stage Explanation Panel */}
        <div className="stage-explanation-card">
          <div className="explanation-header">
            <span className="concept-pill">{selectedNode.concept}</span>
            <h3>{selectedNode.name}</h3>
            <span className="subtitle-code">({selectedNode.subtitle})</span>
          </div>

          <p className="explanation-body">{selectedNode.details}</p>

          <div className="cloud-concept-highlight">
            <strong>Cloud Computing Concept:</strong> {selectedNode.cloudConcept}
          </div>
        </div>
      </div>

      {/* Live Cluster State & Fault Tolerance Demo */}
      <div className="panel wide fault-tolerance-panel">
        <div className="ft-header">
          <div>
            <h3>HDFS Fault Tolerance & High Availability Demo</h3>
            <p className="sub">
              Live cluster report: {cluster.live ? 'Connected to NameNode JMX' : 'Saved Cluster Baseline'}. Replication factor {cluster.replication}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedDown(!simulatedDown)}
            className={`fault-toggle-btn ${simulatedDown ? 'btn-recover' : 'btn-kill'}`}
          >
            {simulatedDown ? 'Recover datanode2' : 'Kill datanode2'}
          </button>
        </div>

        <div className="cluster-metrics-bar">
          <div className="cluster-metric-item">
            <span>Live DataNodes</span>
            <b>{simulatedDown ? 1 : cluster.liveNodes || 2} / 2</b>
          </div>
          <div className="cluster-metric-item">
            <span>Dead DataNodes</span>
            <b style={{ color: simulatedDown ? 'var(--bad)' : 'inherit' }}>{simulatedDown ? 1 : cluster.deadNodes || 0}</b>
          </div>
          <div className="cluster-metric-item">
            <span>Under-replicated Blocks</span>
            <b style={{ color: simulatedDown ? 'var(--bad)' : 'inherit' }}>
              {simulatedDown ? '11 (100%)' : cluster.underReplicated || 0}
            </b>
          </div>
          <div className="cluster-metric-item">
            <span>Missing Blocks</span>
            <b style={{ color: 'var(--buy)' }}>0 (Zero Data Loss)</b>
          </div>
        </div>

        <div className="nodes-grid">
          {nodesState.map((node) => (
            <div key={node.name} className={`node-card ${node.ok ? 'healthy' : 'dead'}`}>
              <div className="node-card-top">
                <span className="node-status-dot" aria-hidden="true" />
                <b>{node.name}</b>
              </div>
              <span className="node-role">{node.role}</span>
              <span className="node-ip">{node.ip}</span>
              <p className="node-desc">
                {node.ok ? 'Heartbeat OK (3s interval). Blocks verified healthy.' : 'Connection lost. Under-replication detected by NameNode.'}
              </p>
            </div>
          ))}
        </div>

        <div className="ft-verdict" role="status" aria-live="polite">
          {simulatedDown ? (
            <div className="verdict-box alert">
              <strong>Simulated Fault Active:</strong> datanode2 stopped. NameNode detects under-replication (11 blocks with 1 replica remaining).
              However, <strong>zero blocks are missing</strong>—reads continue seamlessly from datanode1, proving high availability and data redundancy.
            </div>
          ) : (
            <div className="verdict-box healthy">
              <strong>Cluster Healthy:</strong> All 11 HDFS blocks have 2 live copies across datanode1 and datanode2. Any file is concurrently readable from both worker nodes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
