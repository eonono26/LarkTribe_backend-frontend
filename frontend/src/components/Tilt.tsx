"use client";

import { useRef } from "react";

/**
 * Pointer-driven 3D tilt with a lit highlight. Mouse/pen only —
 * touch devices and reduced-motion users get a flat, still element.
 */
export default function Tilt({
  children,
  className = "",
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") return;
    const el = inner.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${(px - 0.5) * max * 2}deg) rotateX(${(0.5 - py) * max * 2}deg) scale3d(1.015,1.015,1.015)`;
    if (glare.current) {
      glare.current.style.opacity = "1";
      glare.current.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.28), transparent 55%)`;
    }
  }

  function leave() {
    if (inner.current) inner.current.style.transform = "";
    if (glare.current) glare.current.style.opacity = "0";
  }

  return (
    <div className={`tilt ${className}`} onPointerMove={move} onPointerLeave={leave}>
      <div ref={inner} className="tilt-inner relative h-full w-full">
        {children}
        <div ref={glare} aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300" />
      </div>
    </div>
  );
}
