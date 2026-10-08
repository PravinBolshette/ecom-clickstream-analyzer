import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Robust WebGL capability detection.
 * Returns false if WebGL context creation fails.
 */
function isWebGLAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * 3D Node Mesh with glowing shell, pulse animation, and hover/click events.
 */
function Node3D({
  position,
  color,
  size = 0.5,
  shape = 'octahedron',
  isDead = false,
  isSelected = false,
  onSelect,
  prefersReduced = false
}) {
  const meshRef = useRef();
  const wireframeRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (prefersReduced) return;
    const time = state.clock.getElapsedTime();

    if (meshRef.current) {
      if (!isDead) {
        meshRef.current.rotation.y += delta * 0.8;
        meshRef.current.rotation.x += delta * 0.4;
      }
      const scaleBase = isSelected ? 1.3 : hovered ? 1.2 : 1.0;
      const pulse = isDead ? 0.9 : scaleBase + Math.sin(time * 3) * 0.04;
      meshRef.current.scale.set(pulse, pulse, pulse);
    }

    if (wireframeRef.current && !isDead) {
      wireframeRef.current.rotation.y -= delta * 0.5;
      wireframeRef.current.rotation.z += delta * 0.3;
    }
  });

  const nodeColor = isDead ? '#ef4444' : color;

  return (
    <group position={position}>
      {/* Outer pulsing wireframe shell */}
      <mesh
        ref={wireframeRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelect) onSelect();
        }}
      >
        {shape === 'octahedron' ? (
          <octahedronGeometry args={[size * 1.6, 0]} />
        ) : shape === 'box' ? (
          <boxGeometry args={[size * 1.5, size * 1.5, size * 1.5]} />
        ) : (
          <sphereGeometry args={[size * 1.4, 16, 16]} />
        )}
        <meshBasicMaterial
          color={nodeColor}
          wireframe
          transparent
          opacity={isDead ? 0.35 : hovered || isSelected ? 0.85 : 0.4}
        />
      </mesh>

      {/* Inner solid glowing core */}
      <mesh ref={meshRef}>
        {shape === 'octahedron' ? (
          <octahedronGeometry args={[size, 1]} />
        ) : shape === 'box' ? (
          <boxGeometry args={[size * 1.1, size * 1.1, size * 1.1]} />
        ) : (
          <sphereGeometry args={[size, 24, 24]} />
        )}
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isDead ? 0.2 : hovered || isSelected ? 0.9 : 0.55}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Equatorial glow ring */}
      {!isDead && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.6, size * 1.75, 32]} />
          <meshBasicMaterial
            color={nodeColor}
            side={THREE.DoubleSide}
            transparent
            opacity={hovered || isSelected ? 0.8 : 0.35}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * 11 Orbiting Miniature HDFS Block Replicas around a DataNode
 */
function OrbitingBlocks({
  centerPosition,
  count = 11,
  radius = 1.3,
  isDead = false,
  color = '#10b981',
  prefersReduced = false
}) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (prefersReduced || isDead || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.9;
    groupRef.current.rotation.x += delta * 0.3;
  });

  const blockOffsets = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const phi = (i % 3 - 1) * 0.45;
      const x = radius * Math.cos(angle) * Math.cos(phi);
      const y = radius * Math.sin(phi);
      const z = radius * Math.sin(angle) * Math.cos(phi);
      list.push([x, y, z]);
    }
    return list;
  }, [count, radius]);

  const blockColor = isDead ? '#f59e0b' : color;

  return (
    <group position={centerPosition} ref={groupRef}>
      {blockOffsets.map((offset, idx) => (
        <mesh key={idx} position={offset}>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          <meshStandardMaterial
            color={blockColor}
            emissive={blockColor}
            emissiveIntensity={isDead ? 0.3 : 0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Dynamic animated beam connection between two 3D vector points.
 */
function ConnectionBeam({
  start,
  end,
  color = '#38bdf8',
  active = true,
  particleCount = 10,
  prefersReduced = false
}) {
  const lineGeometry = useMemo(() => {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [start, end]);

  const particlesRef = useRef();
  const particleTValuesRef = useRef(
    Array.from({ length: particleCount }, (_, i) => i / particleCount)
  );

  const pPositions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);

  useFrame((_, delta) => {
    if (prefersReduced || !active || !particlesRef.current) return;
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);
    const posAttr = particlesRef.current.geometry.attributes.position;
    const particleTValues = particleTValuesRef.current;

    for (let i = 0; i < particleCount; i++) {
      particleTValues[i] = (particleTValues[i] + delta * 0.65) % 1.0;
      const currentPos = new THREE.Vector3().lerpVectors(vStart, vEnd, particleTValues[i]);
      posAttr.array[i * 3] = currentPos.x;
      posAttr.array[i * 3 + 1] = currentPos.y;
      posAttr.array[i * 3 + 2] = currentPos.z;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Structural connector line */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.3 : 0.08}
          linewidth={1}
        />
      </line>

      {/* Moving data packets along the connection */}
      {active && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particleCount}
              array={pPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.09}
            color={color}
            transparent
            opacity={0.9}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  );
}

/**
 * 3D Hadoop Cluster World inside Canvas.
 */
function ClusterWorld({
  _cluster,
  simulatedDown,
  selectedNodeId,
  setSelectedNodeId,
  prefersReduced,
  rotationState
}) {
  const worldRef = useRef();

  useFrame((_, delta) => {
    if (!worldRef.current) return;
    if (!rotationState.current.isDragging && !prefersReduced) {
      worldRef.current.rotation.y += delta * 0.15;
    } else {
      // Smooth lerp to user drag rotation
      worldRef.current.rotation.y += (rotationState.current.targetY - worldRef.current.rotation.y) * 0.1;
      worldRef.current.rotation.x += (rotationState.current.targetX - worldRef.current.rotation.x) * 0.1;
    }
  });

  const POS_NAMENODE = [0, 0, 0];
  const POS_DATANODE1 = [-3.4, -0.4, 0];
  const POS_DATANODE2 = [3.4, -0.4, 0];
  const POS_RESOURCEMANAGER = [0, 2.4, 0];
  const POS_NODEMANAGER = [0, -2.4, 0];

  return (
    <group ref={worldRef}>
      {/* Lights */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 5, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={POS_NAMENODE} intensity={2.0} color="#38bdf8" distance={6} />
      <pointLight position={POS_DATANODE1} intensity={1.8} color="#10b981" distance={5} />
      <pointLight
        position={POS_DATANODE2}
        intensity={simulatedDown ? 0.5 : 1.8}
        color={simulatedDown ? '#ef4444' : '#10b981'}
        distance={5}
      />
      <pointLight position={POS_RESOURCEMANAGER} intensity={1.5} color="#f59e0b" distance={5} />

      {/* ── CENTRAL MASTER: NAMENODE ────────────────────────────────────────── */}
      <Node3D
        position={POS_NAMENODE}
        color="#38bdf8"
        size={0.65}
        shape="octahedron"
        label="NameNode"
        isSelected={selectedNodeId === 'namenode'}
        onSelect={() => setSelectedNodeId('namenode')}
        prefersReduced={prefersReduced}
      />

      {/* ── WORKER STORAGE: DATANODE 1 ─────────────────────────────────────── */}
      <Node3D
        position={POS_DATANODE1}
        color="#10b981"
        size={0.5}
        shape="box"
        label="DataNode 1"
        isSelected={selectedNodeId === 'datanode1'}
        onSelect={() => setSelectedNodeId('datanode1')}
        prefersReduced={prefersReduced}
      />
      <OrbitingBlocks
        centerPosition={POS_DATANODE1}
        count={11}
        radius={1.2}
        isDead={false}
        color="#10b981"
        prefersReduced={prefersReduced}
      />

      {/* ── WORKER STORAGE: DATANODE 2 (Simulatable Failover) ────────────────── */}
      <Node3D
        position={POS_DATANODE2}
        color="#10b981"
        size={0.5}
        shape="box"
        label="DataNode 2"
        isDead={simulatedDown}
        isSelected={selectedNodeId === 'datanode2'}
        onSelect={() => setSelectedNodeId('datanode2')}
        prefersReduced={prefersReduced}
      />
      <OrbitingBlocks
        centerPosition={POS_DATANODE2}
        count={11}
        radius={1.2}
        isDead={simulatedDown}
        color={simulatedDown ? '#ef4444' : '#10b981'}
        prefersReduced={prefersReduced}
      />

      {/* ── COMPUTE MASTER: YARN RESOURCEMANAGER ────────────────────────────── */}
      <Node3D
        position={POS_RESOURCEMANAGER}
        color="#f59e0b"
        size={0.55}
        shape="octahedron"
        label="ResourceManager"
        isSelected={selectedNodeId === 'resourcemanager'}
        onSelect={() => setSelectedNodeId('resourcemanager')}
        prefersReduced={prefersReduced}
      />

      {/* ── COMPUTE WORKER: NODEMANAGER ─────────────────────────────────────── */}
      <Node3D
        position={POS_NODEMANAGER}
        color="#8b5cf6"
        size={0.48}
        shape="sphere"
        label="NodeManager"
        isSelected={selectedNodeId === 'nodemanager'}
        onSelect={() => setSelectedNodeId('nodemanager')}
        prefersReduced={prefersReduced}
      />

      {/* ── DISTRIBUTED DATA FLOW BEAMS ─────────────────────────────────────── */}
      {/* NameNode <-> DataNode 1: Heartbeats & Block Reports */}
      <ConnectionBeam
        start={POS_NAMENODE}
        end={POS_DATANODE1}
        color="#10b981"
        active={true}
        particleCount={12}
        prefersReduced={prefersReduced}
      />

      {/* NameNode <-> DataNode 2: Heartbeats (extinguished if down) */}
      <ConnectionBeam
        start={POS_NAMENODE}
        end={POS_DATANODE2}
        color={simulatedDown ? '#ef4444' : '#10b981'}
        active={!simulatedDown}
        particleCount={12}
        prefersReduced={prefersReduced}
      />

      {/* DataNode 1 <-> DataNode 2: Replication Pipeline (Replication Factor = 2) */}
      <ConnectionBeam
        start={POS_DATANODE1}
        end={POS_DATANODE2}
        color="#06b6d4"
        active={!simulatedDown}
        particleCount={14}
        prefersReduced={prefersReduced}
      />

      {/* NameNode <-> ResourceManager: Hadoop Master IPC */}
      <ConnectionBeam
        start={POS_NAMENODE}
        end={POS_RESOURCEMANAGER}
        color="#f59e0b"
        active={true}
        particleCount={9}
        prefersReduced={prefersReduced}
      />

      {/* ResourceManager <-> NodeManager: Container Scheduling */}
      <ConnectionBeam
        start={POS_RESOURCEMANAGER}
        end={POS_NODEMANAGER}
        color="#8b5cf6"
        active={true}
        particleCount={9}
        prefersReduced={prefersReduced}
      />
    </group>
  );
}

const NODE_DETAILS = {
  namenode: {
    title: 'HDFS NameNode (Master)',
    role: 'Central Metadata Controller & Inode Table',
    ip: '172.19.0.2:9000 (IPC) & :9870 (Web UI)',
    status: 'HEALTHY',
    blocks: 'Tracks 11 blocks for clickstream.csv',
    capacity: '2017 GB total storage managed',
    concept: 'Centralized Metadata Architecture',
    explanation:
      'NameNode maps file paths to block IDs and manages replication targets without storing raw file bytes. Keeps full inode namespace in memory for sub-millisecond lookups.'
  },
  datanode1: {
    title: 'HDFS DataNode 1 (Worker)',
    role: 'Distributed Block Storage Node',
    ip: '172.19.0.4:9866 (Transfer) & :9864 (HTTP)',
    status: 'HEALTHY',
    blocks: 'Holds 11 verified block replicas (16MB each)',
    capacity: '0.16 GB used / 1000 GB allocated',
    concept: 'Data Locality & Block Redundancy',
    explanation:
      'Stores 16MB raw byte blocks directly on local ext4 filesystem. Periodically sends block reports and heartbeats to NameNode every 3 seconds.'
  },
  datanode2: {
    title: 'HDFS DataNode 2 (Worker)',
    role: 'Distributed Block Storage Node (Replica Target)',
    ip: '172.19.0.3:9866 (Transfer) & :9864 (HTTP)',
    status: 'HEALTHY',
    blocks: 'Holds 11 verified block replicas (16MB each)',
    capacity: '0.16 GB used / 1000 GB allocated',
    concept: 'High Availability & Fault Tolerance',
    explanation:
      'Replication factor 2 ensures identical copy of all 11 blocks. When stopped, NameNode detects missing heartbeats and transparently redirects reads to DataNode 1.'
  },
  resourcemanager: {
    title: 'YARN ResourceManager (Compute Master)',
    role: 'Global Application Scheduler & Container Arbiter',
    ip: '172.19.0.5:8088 (Web UI)',
    status: 'HEALTHY',
    blocks: 'Allocates containers across NodeManagers',
    capacity: '8192 MB Memory / 8 VCores capacity',
    concept: 'Resource Negotiation & Elastic Scheduling',
    explanation:
      'Coordinates MapReduce jobs. Dynamically assigns container slots to ApplicationMasters and monitors NodeManager compute health.'
  },
  nodemanager: {
    title: 'YARN NodeManager (Compute Worker)',
    role: 'Container Launcher & Task Lifecycle Manager',
    ip: '172.19.0.6:8042 (Status UI)',
    status: 'HEALTHY',
    blocks: 'Executes Python 3.5.3 Map tasks in parallel',
    capacity: 'Up to 11 concurrent streaming containers',
    concept: 'Compute-to-Data Colocation',
    explanation:
      'Launches containers on the same host where DataNodes store blocks, eliminating network bandwidth bottlenecks during Map tasks.'
  }
};

/**
 * Enterprise 3D Cluster Spatial Scene with WebGL verification and fallback capability.
 */
export default function ClusterScene3D({
  cluster = {},
  simulatedDown = false,
  onFallbackToIso
}) {
  const [hasWebGL] = useState(() => isWebGLAvailable());
  const [selectedNodeId, setSelectedNodeId] = useState('namenode');
  const [prefersReduced, setPrefersReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  const rotationState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    targetX: 0.2,
    targetY: 0.5
  });

  useEffect(() => {
    if (!hasWebGL && onFallbackToIso) {
      onFallbackToIso();
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReduced(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [hasWebGL, onFallbackToIso]);

  const handleMouseDown = (e) => {
    rotationState.current.isDragging = true;
    rotationState.current.startX = e.clientX;
    rotationState.current.startY = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!rotationState.current.isDragging) return;
    const dx = e.clientX - rotationState.current.startX;
    const dy = e.clientY - rotationState.current.startY;
    rotationState.current.startX = e.clientX;
    rotationState.current.startY = e.clientY;

    rotationState.current.targetY += dx * 0.008;
    rotationState.current.targetX = Math.max(
      -0.6,
      Math.min(0.6, rotationState.current.targetX + dy * 0.008)
    );
  };

  const handleMouseUp = () => {
    rotationState.current.isDragging = false;
  };

  if (!hasWebGL) {
    return (
      <div className="webgl-fallback-notice panel">
        <p>WebGL is not available in your environment. Switched to 2.5D Isometric CSS view.</p>
        {onFallbackToIso && (
          <button type="button" onClick={onFallbackToIso} className="btn-secondary">
            View Isometric CSS Architecture
          </button>
        )}
      </div>
    );
  }

  const selectedNode = {
    ...NODE_DETAILS[selectedNodeId],
    ...(selectedNodeId === 'datanode2' && simulatedDown
      ? {
          status: 'DEAD (SIMULATED FAILURE)',
          explanation:
            'Heartbeat disconnected. NameNode detects under-replication of 11 blocks, but all data remains immediately accessible on DataNode 1 replica.'
        }
      : {})
  };

  return (
    <div className="cluster-scene-3d-wrapper">
      {/* 3D WebGL Canvas Viewport */}
      <div
        className="cluster-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Canvas
          camera={{ position: [0, 1.8, 8.2], fov: 48 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ClusterWorld
            cluster={cluster}
            simulatedDown={simulatedDown}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            prefersReduced={prefersReduced}
            rotationState={rotationState}
          />
        </Canvas>

        {/* Viewport HUD Overlays */}
        <div className="scene-hud-top-left">
          <div className="hud-badge-row">
            <span className="hud-badge pulse-dot">
              <span className={`status-indicator ${simulatedDown ? 'warn' : 'ok'}`} />
              3D SPATIAL TOPOLOGY
            </span>
            <span className="hud-blocks-badge">
              11 BLOCKS (16MB SPLITS)
            </span>
          </div>
          <div className="hud-instruction-text">
            Drag to rotate • Click nodes to inspect telemetry
          </div>
        </div>

        {/* Node Selector Quick Chips */}
        <div className="scene-hud-chips">
          {Object.entries(NODE_DETAILS).map(([id, info]) => (
            <button
              key={id}
              type="button"
              className={`node-chip-btn ${selectedNodeId === id ? 'active' : ''} ${
                id === 'datanode2' && simulatedDown ? 'chip-dead' : ''
              }`}
              onClick={() => setSelectedNodeId(id)}
            >
              {info.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Node Telemetry Card */}
      <div className="node-inspector-panel">
        <div className="inspector-header">
          <div>
            <div className="inspector-title-row">
              <span
                className={`inspector-status-dot ${
                  selectedNode.status.includes('DEAD') ? 'dot-red' : 'dot-green'
                }`}
                aria-hidden="true"
              />
              <h4>{selectedNode.title}</h4>
            </div>
            <span className="inspector-role">{selectedNode.role}</span>
          </div>
          <span
            className={`inspector-status-pill ${
              selectedNode.status.includes('DEAD') ? 'status-dead' : 'status-healthy'
            }`}
          >
            {selectedNode.status}
          </span>
        </div>

        <div className="inspector-grid">
          <div className="inspector-stat">
            <span className="stat-label">Network Coordinates</span>
            <span className="stat-val font-mono">{selectedNode.ip}</span>
          </div>
          <div className="inspector-stat">
            <span className="stat-label">HDFS Capacity & Inodes</span>
            <span className="stat-val">{selectedNode.blocks}</span>
          </div>
          <div className="inspector-stat">
            <span className="stat-label">Storage Allocation</span>
            <span className="stat-val">{selectedNode.capacity}</span>
          </div>
          <div className="inspector-stat">
            <span className="stat-label">Distributed Concept</span>
            <span className="stat-val text-cyan">{selectedNode.concept}</span>
          </div>
        </div>

        <p className="inspector-desc">{selectedNode.explanation}</p>
      </div>
    </div>
  );
}
