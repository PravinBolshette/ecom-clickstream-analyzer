import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Color definitions matching the design system with chromatic grading
const COLOR_VIEW_DEEP = new THREE.Color('#1d4e6a');
const COLOR_VIEW = new THREE.Color('#2a6f97'); // Stage 1: Blue
const COLOR_CART = new THREE.Color('#e8a33d'); // Stage 2: Amber
const COLOR_PURCHASE = new THREE.Color('#1d7a5f'); // Stage 3: Green
const COLOR_PURCHASE_DEEP = new THREE.Color('#135542');
const COLOR_DROPPED = new THREE.Color('#788b9c'); // Dropped out

// Smooth color grading function across funnel depth t in [0.0, 1.0]
function getGradedColor(t, outColor) {
  if (t < 0.15) {
    outColor.lerpColors(COLOR_VIEW_DEEP, COLOR_VIEW, t / 0.15);
  } else if (t < 0.32) {
    outColor.copy(COLOR_VIEW);
  } else if (t < 0.44) {
    // Smooth transition from View blue to Cart amber
    const alpha = (t - 0.32) / 0.12;
    outColor.lerpColors(COLOR_VIEW, COLOR_CART, alpha);
  } else if (t < 0.65) {
    outColor.copy(COLOR_CART);
  } else if (t < 0.77) {
    // Smooth transition from Cart amber to Purchase green
    const alpha = (t - 0.65) / 0.12;
    outColor.lerpColors(COLOR_CART, COLOR_PURCHASE, alpha);
  } else if (t < 0.9) {
    outColor.copy(COLOR_PURCHASE);
  } else {
    outColor.lerpColors(COLOR_PURCHASE, COLOR_PURCHASE_DEEP, (t - 0.9) / 0.1);
  }
  return outColor;
}

function createInitialParticles(count) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const meta = [];
  const tempCol = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const theta = Math.random() * Math.PI * 2;
    const speed = 0.12 + Math.random() * 0.16;
    const radialVariation = (Math.random() - 0.5) * 0.22;
    const destiny = Math.random();

    let r, y;
    if (t < 0.35) {
      const progress = t / 0.35;
      y = 3.2 - progress * 2.4;
      r = 3.0 - progress * 1.2 + radialVariation;
    } else if (t < 0.7) {
      const progress = (t - 0.35) / 0.35;
      y = 0.8 - progress * 2.0;
      r = 1.8 - progress * 1.05 + radialVariation;
    } else {
      const progress = (t - 0.7) / 0.3;
      y = -1.2 - progress * 2.0;
      r = 0.75 - progress * 0.3 + radialVariation * 0.5;
    }

    pos[i * 3] = r * Math.cos(theta);
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = r * Math.sin(theta);

    getGradedColor(t, tempCol);

    col[i * 3] = tempCol.r;
    col[i * 3 + 1] = tempCol.g;
    col[i * 3 + 2] = tempCol.b;

    meta.push({
      t,
      theta,
      speed,
      radialVariation,
      destiny,
      dropped: false,
      dropT: 0,
      baseR: tempCol.r,
      baseG: tempCol.g,
      baseB: tempCol.b,
    });
  }

  return { positions: pos, colors: col, meta };
}

function FunnelMesh() {
  return (
    <group position={[0, 0, 0]}>
      {/* Top ring (View stage: Blue) */}
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.0, 0.015, 8, 48]} />
        <meshBasicMaterial color="#2a6f97" opacity={0.35} transparent />
      </mesh>
      {/* Mid ring (Cart threshold: Amber) */}
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.015, 8, 48]} />
        <meshBasicMaterial color="#e8a33d" opacity={0.35} transparent />
      </mesh>
      {/* Bottom ring (Purchase threshold: Green) */}
      <mesh position={[0, -1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.015, 8, 48]} />
        <meshBasicMaterial color="#1d7a5f" opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

function FunnelParticles({ count, cartRatio, purchaseRatio, prefersReduced }) {
  const pointsRef = useRef();
  const groupRef = useRef();
  const tempColorRef = useRef(new THREE.Color());
  const initialData = useMemo(() => createInitialParticles(count), [count]);
  const particlesRef = useRef(initialData.meta);

  useEffect(() => {
    particlesRef.current = initialData.meta;
  }, [initialData]);

  const { positions, colors } = initialData;

  useFrame((_, delta) => {
    if (prefersReduced) return;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.14;
    }

    if (!pointsRef.current || !particlesRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;
    const colAttr = geom.attributes.color;
    const particles = particlesRef.current;
    const tempCol = tempColorRef.current;

    const clampedDelta = Math.min(delta, 0.05);

    for (let i = 0; i < count; i++) {
      const p = particles[i];

      if (!p.dropped) {
        if (p.t > 0.35 && p.destiny > cartRatio) {
          p.dropped = true;
          p.dropT = 0;
        } else if (p.t > 0.7 && p.destiny > purchaseRatio) {
          p.dropped = true;
          p.dropT = 0;
        }
      }

      const i3 = i * 3;
      if (p.dropped) {
        p.dropT += clampedDelta * 1.5;
        p.t += p.speed * clampedDelta * 0.5;
        p.radialVariation += clampedDelta * 0.8;

        posAttr.array[i3] += Math.cos(p.theta) * clampedDelta * 1.2;
        posAttr.array[i3 + 1] -= clampedDelta * 0.6;
        posAttr.array[i3 + 2] += Math.sin(p.theta) * clampedDelta * 1.2;

        // Smoothly grade dropped points from stage color to slate gray
        const dropAlpha = Math.min(p.dropT / 0.6, 1.0);
        colAttr.array[i3] = THREE.MathUtils.lerp(p.baseR, COLOR_DROPPED.r, dropAlpha);
        colAttr.array[i3 + 1] = THREE.MathUtils.lerp(p.baseG, COLOR_DROPPED.g, dropAlpha);
        colAttr.array[i3 + 2] = THREE.MathUtils.lerp(p.baseB, COLOR_DROPPED.b, dropAlpha);

        if (p.dropT > 0.8 || p.t >= 1.0) {
          p.t = 0;
          p.dropped = false;
          p.dropT = 0;
          p.radialVariation = (Math.random() - 0.5) * 0.22;
          p.destiny = Math.random();
          p.theta = Math.random() * Math.PI * 2;
        }
      } else {
        p.t += p.speed * clampedDelta;
        if (p.t >= 1.0) {
          p.t = 0;
          p.destiny = Math.random();
          p.theta = Math.random() * Math.PI * 2;
        }

        let r, y;
        if (p.t < 0.35) {
          const progress = p.t / 0.35;
          y = 3.2 - progress * 2.4;
          r = 3.0 - progress * 1.2 + p.radialVariation;
        } else if (p.t < 0.7) {
          const progress = (p.t - 0.35) / 0.35;
          y = 0.8 - progress * 2.0;
          r = 1.8 - progress * 1.05 + p.radialVariation;
        } else {
          const progress = (p.t - 0.7) / 0.3;
          y = -1.2 - progress * 2.0;
          r = 0.75 - progress * 0.3 + p.radialVariation * 0.5;
        }

        posAttr.array[i3] = r * Math.cos(p.theta);
        posAttr.array[i3 + 1] = y;
        posAttr.array[i3 + 2] = r * Math.sin(p.theta);

        // Calculate smooth colour grade along funnel progression
        getGradedColor(p.t, tempCol);
        p.baseR = tempCol.r;
        p.baseG = tempCol.g;
        p.baseB = tempCol.b;

        colAttr.array[i3] = tempCol.r;
        colAttr.array[i3 + 1] = tempCol.g;
        colAttr.array[i3 + 2] = tempCol.b;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <FunnelMesh />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.065}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

export default function HeroScene3D({ views = 802574, carts = 360035, purchases = 138275 }) {
  const [pointCount, setPointCount] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 1000 : 3000
  );
  const [prefersReduced, setPrefersReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const handleResize = () => {
      setPointCount(window.innerWidth < 768 ? 1000 : 3000);
    };

    window.addEventListener('resize', handleResize);

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMediaChange = (e) => setPrefersReduced(e.matches);
    media.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      media.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const cartRatio = views > 0 ? carts / views : 0.45;
  const purchaseRatio = views > 0 ? purchases / views : 0.17;

  return (
    <div className="hero-canvas-wrapper" style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0.4, 8.8], fov: 46 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <FunnelParticles
          count={pointCount}
          cartRatio={cartRatio}
          purchaseRatio={purchaseRatio}
          prefersReduced={prefersReduced}
        />
      </Canvas>
    </div>
  );
}
