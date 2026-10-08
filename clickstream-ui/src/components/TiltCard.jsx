import React, { useRef, useEffect } from 'react';

/**
 * TiltCard: High-performance 3D parallax tilt card.
 *
 * Mandatory Performance Rules:
 * - ZERO React state on mousemove (avoids re-rendering component trees).
 * - RAF animation loop with lerping (linear interpolation factor 0.12).
 * - Smooth CSS variable writes: --rx, --ry, --mx, --my, --glare-opacity.
 * - Max tilt: +/-10deg on KPI cards, +/-4deg on chart cards.
 * - Smooth spring-like return to rest on mouseleave.
 * - Disabled automatically on touch devices (hover: none) and prefers-reduced-motion.
 */
export default function TiltCard({
  children,
  className = '',
  maxTilt = 10,
  glare = true,
  style = {},
  ...props
}) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);

  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const isHovered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check touch devices or prefers-reduced-motion
    const isTouch = window.matchMedia('(hover: none)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReducedMotion) return;

    const card = cardRef.current;
    if (!card) return;

    const animate = () => {
      // Smooth linear interpolation (lerp)
      currentX.current += (targetX.current - currentX.current) * 0.12;
      currentY.current += (targetY.current - currentY.current) * 0.12;

      // Update CSS variables directly on DOM element
      card.style.setProperty('--rx', `${currentX.current.toFixed(2)}deg`);
      card.style.setProperty('--ry', `${currentY.current.toFixed(2)}deg`);

      const delta =
        Math.abs(targetX.current - currentX.current) +
        Math.abs(targetY.current - currentY.current);

      if (isHovered.current || delta > 0.04) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--glare-opacity', '0');
        rafRef.current = null;
      }
    };

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      // Normalized coordinates from -1.0 to +1.0
      const normX = (x / width) * 2 - 1;
      const normY = (y / height) * 2 - 1;

      // Inverted rotateX tilts vertically; rotateY tilts horizontally
      targetX.current = -normY * maxTilt;
      targetY.current = normX * maxTilt;

      const glareX = ((x / width) * 100).toFixed(1);
      const glareY = ((y / height) * 100).toFixed(1);

      card.style.setProperty('--mx', `${glareX}%`);
      card.style.setProperty('--my', `${glareY}%`);
      card.style.setProperty('--glare-opacity', '1');

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseEnter = () => {
      isHovered.current = true;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseLeave = () => {
      isHovered.current = false;
      targetX.current = 0;
      targetY.current = 0;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [maxTilt]);

  return (
    <div
      ref={cardRef}
      className={`tilt-card-wrapper ${glare ? 'has-glare' : ''} ${className}`}
      style={{
        '--rx': '0deg',
        '--ry': '0deg',
        '--mx': '50%',
        '--my': '50%',
        '--glare-opacity': '0',
        ...style
      }}
      {...props}
    >
      <div className="tilt-card-content">{children}</div>
      {glare && <div className="tilt-specular-glare" aria-hidden="true" />}
    </div>
  );
}
