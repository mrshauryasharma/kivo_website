import React, { useEffect, useRef, useState } from 'react';

const TRAIL_COUNT = 5;
const TRAIL_SIZES = [14, 11, 8, 6, 4];
const TRAIL_OPACITIES = [0.25, 0.2, 0.14, 0.08, 0.04];
const TRAIL_INDICES = [0, 1, 2, 3, 4];

export const CustomCursor: React.FC = () => {
  // Initialize fine-pointer capability directly during initialization
  const [isEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTextInput, setIsTextInput] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Mouse positions stored in refs for 60fps rAF rendering without triggering re-renders
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const trailPos = useRef(
    Array.from({ length: TRAIL_COUNT }, () => ({ x: -100, y: -100 }))
  );

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled) return;

    document.body.classList.add('custom-cursor-active');

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisible) setIsVisible(true);

      // Instant inner dot placement for 0ms lag
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Check hovered element
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest('a, button, [role="button"], input, select, textarea, .interactive-item, [data-cursor="pointer"]')
        );
        const isText = Boolean(target.closest('input, textarea, [contenteditable="true"]'));

        setIsHovered(isInteractive && !isText);
        setIsTextInput(isText);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Smooth physics loop for outer ring & glowing trail
    let lastTime = performance.now();
    const renderLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Lerp for outer ring: silky smooth fluid trailing
      const lerpFactor = Math.min(dt * 14, 0.35);
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * lerpFactor;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * lerpFactor;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      // Update trail positions
      const trail = trailPos.current;
      trail[0].x += (mousePos.current.x - trail[0].x) * 0.45;
      trail[0].y += (mousePos.current.y - trail[0].y) * 0.45;

      for (let i = 1; i < trail.length; i++) {
        trail[i].x += (trail[i - 1].x - trail[i].x) * 0.35;
        trail[i].y += (trail[i - 1].y - trail[i].y) * 0.35;
      }

      // Render trail dots directly to DOM elements
      trail.forEach((point, i) => {
        const el = trailElementsRef.current[i];
        if (el) {
          el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
        }
      });

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);

      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isEnabled, isVisible]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[9999] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* Trailing Ambient Particles */}
      {!isTextInput &&
        TRAIL_INDICES.map((index) => {
          const size = TRAIL_SIZES[index];
          const opacity = TRAIL_OPACITIES[index];

          return (
            <div
              key={index}
              ref={(el) => {
                trailElementsRef.current[index] = el;
              }}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                marginLeft: `-${size / 2}px`,
                marginTop: `-${size / 2}px`,
                opacity: opacity,
              }}
              className="fixed top-0 left-0 rounded-full bg-gradient-to-r from-kivo-cyan via-kivo-blue to-kivo-purple blur-[2px] will-change-transform"
            />
          );
        })}

      {/* Smooth Outer Follower Ring */}
      <div
        ref={ringRef}
        style={{
          width: isHovered ? '48px' : isClicking ? '26px' : isTextInput ? '18px' : '34px',
          height: isHovered ? '48px' : isClicking ? '26px' : isTextInput ? '18px' : '34px',
          marginLeft: isHovered ? '-24px' : isClicking ? '-13px' : isTextInput ? '-9px' : '-17px',
          marginTop: isHovered ? '-24px' : isClicking ? '-13px' : isTextInput ? '-9px' : '-17px',
        }}
        className={`fixed top-0 left-0 rounded-full border transition-[width,height,margin,border-color,background-color] duration-200 ease-out will-change-transform ${
          isTextInput
            ? 'border-white/30 bg-transparent opacity-40'
            : isHovered
            ? 'border-kivo-cyan/80 bg-kivo-cyan/[0.08] shadow-[0_0_20px_rgba(0,217,245,0.35)] scale-110'
            : isClicking
            ? 'border-kivo-purple bg-kivo-purple/20 shadow-[0_0_15px_rgba(165,43,250,0.5)]'
            : 'border-kivo-cyan/40 bg-transparent shadow-[0_0_12px_rgba(8,123,255,0.2)]'
        }`}
      />

      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        style={{
          width: isTextInput ? '2px' : isClicking ? '4px' : isHovered ? '8px' : '6px',
          height: isTextInput ? '16px' : isClicking ? '4px' : isHovered ? '8px' : '6px',
          marginLeft: isTextInput ? '-1px' : isClicking ? '-2px' : isHovered ? '-4px' : '-3px',
          marginTop: isTextInput ? '-8px' : isClicking ? '-2px' : isHovered ? '-4px' : '-3px',
        }}
        className={`fixed top-0 left-0 will-change-transform transition-[width,height,margin,background-color] duration-150 ${
          isTextInput
            ? 'rounded-none bg-kivo-cyan shadow-[0_0_6px_#00D9F5]'
            : isHovered
            ? 'rounded-full bg-white shadow-[0_0_10px_#FFFFFF,0_0_16px_#00D9F5]'
            : isClicking
            ? 'rounded-full bg-kivo-purple shadow-[0_0_8px_#A52BFA]'
            : 'rounded-full bg-gradient-to-r from-kivo-cyan to-kivo-blue shadow-[0_0_8px_#00D9F5]'
        }`}
      />
    </div>
  );
};
