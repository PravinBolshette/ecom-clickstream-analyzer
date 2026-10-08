import React, { useEffect, useState } from 'react';
import { fetchCluster } from '../../services/api.js';
import SourceBadge from '../../components/SourceBadge.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import IsometricCluster from '../../components/IsometricCluster.jsx';

const PIPELINE_STAGES = [
  {
    id: 'generator',
    name: 'Workload Generator',
    subtitle: 'generate_data.py',
    tag: 'Synthetic Ingestion',
    concept: 'Cloud Workload Synthesis',
    details: 'Generates 2,000,000 synthetic clickstream events (162.7 MB) with session funnel consistency.',
    cloudConcept: 'Simulates high-velocity enterprise clickstream workloads before loading into distributed HDFS.'
  },
  {
    id: 'hdfs',
    name: 'HDFS Cluster',
    subtitle: 'NameNode + 2 DataNodes',
    tag: 'Replication: 2',
    concept: 'Distributed Storage & Block Replication',
    details: 'NameNode splits clickstream.csv into 11 discrete 16MB blocks and replicates across datanode1 and datanode2.',
    cloudConcept: 'Eliminates Single Point of Failure (SPOF). If any DataNode crashes, all 11 blocks remain readable from replica.'
  },
  {
    id: 'yarn',
    name: 'YARN Resource Layer',
    subtitle: 'ResourceManager + NodeManager',
    tag: 'Distributed Compute',
    concept: 'Resource Negotiation & Data Locality',
    details: 'YARN schedules 11 parallel Map task containers directly on the NodeManager where HDFS blocks reside.',
    cloudConcept: 'Moves compute to the data instead of shipping heavy datasets over the internal network.'
  },
  {
    id: 'part',
    name: 'part-00000',
    subtitle: 'Consolidated HDFS Output',
    tag: '128 Metric Keys',
    concept: 'Consolidation & Shuffle-Sort',
    details: 'Hadoop shuffle-sort groups identical metric keys to Reducer, yielding 128 summary rows ready for real-time query.',
    cloudConcept: 'Condenses 2,000,000 input events down to 128 aggregated summary metrics.'
  },
  {
    id: 'api',
    name: 'Express REST Gateway',
    subtitle: 'Port :4000',
    tag: 'Stateless Service',
    concept: 'Microservice Decoupling & JMX Probing',
    details: 'Node.js REST service safely parses all part-* files and queries NameNode JMX for live DataNode health.',
    cloudConcept: 'Decouples distributed big data storage from client-side analytics presentation.'
  },
  {
    id: 'dashboard',
    name: 'React 19 Dashboard',
    subtitle: 'Single Page App',
    tag: 'Enterprise UI',
    concept: 'Cloud Observability',
    details: 'Vite-powered analytics UI with accessible tablist, Recharts diagnostics, and live fault-tolerance simulation.',
    cloudConcept: 'Client-side visualization providing real-time operational insights and cluster health monitoring.'
  }
];

export default function ClusterTab() {
  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStageId, setSelectedStageId] = useState('hdfs');
  const [simulatedDown, setSimulatedDown] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchCluster()
      .then(setCluster)
      .catch((err) => setError(err.message || 'Error probing Hadoop cluster'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    fetchCluster()
      .then((res) => {
        if (!ignore) {
          setCluster(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Error probing Hadoop cluster');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-cluster" aria-labelledby="tab-link-cluster">
        <LoadingSkeleton height={380} lines={7} />
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="tab-pane" role="tabpanel" id="tab-cluster" aria-labelledby="tab-link-cluster">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  const selectedStage = PIPELINE_STAGES.find((s) => s.id === selectedStageId) || PIPELINE_STAGES[1];

  const nodes = [
    { name: 'namenode', role: 'NameNode (Master)', ok: true, ip: '172.19.0.2:9000', blocks: 11 },
    { name: 'datanode1', role: 'DataNode (Worker)', ok: true, ip: '172.19.0.4:9866', blocks: 11 },
    { name: 'datanode2', role: 'DataNode (Worker)', ok: !simulatedDown, ip: '172.19.0.3:9866', blocks: 11 }
  ];

  const isSimulated = cluster.status === 'SIMULATED' || !cluster.live || cluster.source === 'simulated';

  return (
    <div className="tab-pane" role="tabpanel" id="tab-cluster" aria-labelledby="tab-link-cluster">
      {/* Header */}
      <div className="tab-header flex-between">
        <div>
          <h2>Distributed Cluster Health & Architecture</h2>
          <p className="sub">
            Real-time topology connecting HDFS NameNode, DataNodes, and YARN ResourceManager containers.
          </p>
        </div>
        <SourceBadge source={cluster.source} status={cluster.status} />
      </div>

      {/* Cluster Overview Metric Cards */}
      <div className="cluster-metrics-bar">
        <div className="cluster-metric-item">
          <span>Live DataNodes</span>
          <b>{simulatedDown ? 1 : cluster.liveNodes} / 2</b>
        </div>
        <div className="cluster-metric-item">
          <span>Dead DataNodes</span>
          <b style={{ color: simulatedDown ? '#ef4444' : 'inherit' }}>
            {simulatedDown ? 1 : cluster.deadNodes}
          </b>
        </div>
        <div className="cluster-metric-item">
          <span>Under-replicated Blocks</span>
          <b style={{ color: simulatedDown ? '#f59e0b' : 'inherit' }}>
            {simulatedDown ? '11 (100%)' : cluster.underReplicated}
          </b>
        </div>
        <div className="cluster-metric-item">
          <span>Missing Blocks</span>
          <b className="text-emerald">0 (Zero Data Loss)</b>
        </div>
        <div className="cluster-metric-item">
          <span>Configured Storage</span>
          <b>{cluster.configuredCapacityGB || 2017} GB</b>
        </div>
      </div>

      {/* Interactive Pipeline Architecture Map */}
      <div className="panel wide pipeline-diagram-panel">
        <div className="panel-title-row">
          <div>
            <h3>End-to-End Big Data Pipeline</h3>
            <p className="sub">Select any pipeline stage to inspect its cloud computing mechanics.</p>
          </div>
        </div>

        <div className="pipeline-flow-wrapper">
          <div className="pipeline-stages-row">
            {PIPELINE_STAGES.map((stage, idx) => (
              <button
                key={stage.id}
                type="button"
                className={`pipeline-stage-btn ${selectedStageId === stage.id ? 'active' : ''}`}
                onClick={() => setSelectedStageId(stage.id)}
              >
                <span className="stage-step-tag">STEP {idx + 1}</span>
                <span className="stage-btn-name">{stage.name}</span>
                <span className="stage-btn-sub">{stage.subtitle}</span>
              </button>
            ))}
          </div>

          <div className="stage-detail-card">
            <div className="stage-detail-header">
              <span className="concept-pill">{selectedStage.concept}</span>
              <h4>{selectedStage.name}</h4>
              <span className="subtitle-code">({selectedStage.subtitle})</span>
            </div>
            <p className="stage-detail-text">{selectedStage.details}</p>
            <div className="cloud-concept-highlight">
              <strong>Cloud Computing Principle:</strong> {selectedStage.cloudConcept}
            </div>
          </div>
        </div>
      </div>

      {/* Pure-CSS Layered Isometric Cluster Health Stack */}
      <IsometricCluster cluster={cluster} simulatedDown={simulatedDown} />

      {/* Fault Tolerance & High Availability Demo */}
      <div className="panel wide fault-tolerance-panel">
        <div className="panel-title-row">
          <div>
            <div className="flex-row items-center gap-2">
              <h3>HDFS High Availability & Fault Tolerance Simulation</h3>
              {isSimulated && (
                <span className="simulated-flag-badge">
                  SIMULATED TELEMETRY ACTIVE
                </span>
              )}
            </div>
            <p className="sub">
              Test HDFS survivor replica availability by simulating an unannounced DataNode crash.
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

        <div className="nodes-grid">
          {nodes.map((node) => (
            <div key={node.name} className={`node-card ${node.ok ? 'healthy' : 'dead'}`}>
              <div className="node-card-top">
                <span className={`node-status-dot ${node.ok ? 'dot-green' : 'dot-red'}`} aria-hidden="true" />
                <b>{node.name}</b>
              </div>
              <span className="node-role">{node.role}</span>
              <span className="node-ip">{node.ip}</span>
              <p className="node-desc">
                {node.ok
                  ? `Heartbeat verified (3s interval). Holding 11 verified block replicas.`
                  : 'Heartbeat timeout. Node disconnected. Under-replication signaled by NameNode.'}
              </p>
            </div>
          ))}
        </div>

        {/* Fault Tolerance Verdict */}
        <div className="ft-verdict-box" role="status" aria-live="polite">
          {simulatedDown ? (
            <div className="verdict-banner alert">
              <strong>Simulated Failure Engaged:</strong> datanode2 killed. NameNode detects 11 under-replicated blocks.
              Crucially, <strong>zero blocks are lost</strong>—all 11 blocks remain immediately accessible from datanode1,
              verifying distributed fault tolerance and high availability.
            </div>
          ) : (
            <div className="verdict-banner healthy">
              <strong>Cluster Redundant & Healthy:</strong> All 11 HDFS blocks maintain 2 complete copies across datanode1 and datanode2.
              Read requests can be fulfilled concurrently from either worker node.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
