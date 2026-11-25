"use client";

import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";

/** Drag-to-compare slider (before = left, after = right). */
export default function BeforeAfterSlider({ before, after, alt = "Try-on preview" }: { before: string; after: string; alt?: string }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={box}
      className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden select-none touch-pan-y"
      onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => { dragging.current = false; }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt} — after`} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${alt} — before`} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      </div>
      <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] uppercase tracking-widest px-2 py-1">Before</span>
      <span className="absolute top-3 right-3 bg-black/60 text-white text-[10px] uppercase tracking-widest px-2 py-1">After</span>
      <div className="absolute top-0 bottom-0 w-px bg-white shadow" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center text-black">
          <MoveHorizontal size={16} />
        </div>
      </div>
      <input
        type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after" className="sr-only"
      />
    </div>
  );
}
