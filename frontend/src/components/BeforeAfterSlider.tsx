"use client";

import { useRef, useState } from "react";

/**
 * Drag-to-compare "Before / After" view (the try-on reference screens).
 * Both images are plain <img> because they are local blob/object URLs.
 */
export default function BeforeAfterSlider({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);

  function moveTo(clientX: number) {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }

  return (
    <div
      ref={box}
      className="relative h-full w-full select-none overflow-hidden bg-stone-100 touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e.clientX);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={afterLabel} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={beforeLabel} draggable={false} className="h-full w-full object-contain" />
      </div>

      <span className="absolute left-3 top-3 bg-white/90 px-2 py-1 text-[10px] uppercase tracking-widest">{beforeLabel}</span>
      <span className="absolute right-3 top-3 bg-black/80 px-2 py-1 text-[10px] uppercase tracking-widest text-white">{afterLabel}</span>

      <div className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-stone-300 bg-white text-xs shadow">
          ↔
        </span>
      </div>

      {/* Keyboard / screen-reader control for the same position */}
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="sr-only"
      />
    </div>
  );
}
