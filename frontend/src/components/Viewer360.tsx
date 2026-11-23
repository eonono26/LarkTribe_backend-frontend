"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";

interface Frame { color: string; url: string }

const PX_PER_FRAME = 14;

/**
 * 360° turntable viewer: drag (or swipe) to rotate through photo frames,
 * auto-rotate, zoom and jump-to-angle buttons. Needs a set of evenly spaced
 * photos per colour (uploaded under "360 frames" in the product admin).
 */
export default function Viewer360({ frames, color, alt }: { frames: Frame[]; color?: string | null; alt: string }) {
  const set = useMemo(() => {
    const wanted = (color || "").trim().toLowerCase();
    const matched = frames.filter((f) => f.color.trim().toLowerCase() === wanted && wanted);
    if (matched.length) return matched;
    const general = frames.filter((f) => !f.color);
    return general.length ? general : frames;
  }, [frames, color]);

  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [auto, setAuto] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [origin, setOrigin] = useState("50% 50%");
  const drag = useRef<{ x: number; start: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const n = set.length;

  useEffect(() => { setIdx(0); setLoaded(0); }, [set]);

  // Preload every frame so dragging is smooth.
  useEffect(() => {
    let alive = true;
    set.forEach((f) => {
      const im = new Image();
      im.onload = im.onerror = () => alive && setLoaded((l) => l + 1);
      im.src = f.url;
    });
    return () => { alive = false; };
  }, [set]);

  useEffect(() => {
    if (!auto || n < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 90);
    return () => clearInterval(t);
  }, [auto, n]);

  const step = useCallback((d: number) => setIdx((i) => (((i + d) % n) + n) % n), [n]);

  if (n === 0) return null;
  const ready = loaded >= n;
  const angle = Math.round((idx / n) * 360);
  const viewLabel = angle < 23 || angle >= 338 ? "Front" : angle < 68 ? "Front ¾" : angle < 113 ? "Side" : angle < 158 ? "Back ¾" : angle < 203 ? "Back" : angle < 248 ? "Back ¾" : angle < 293 ? "Side" : "Front ¾";

  return (
    <div className="w-full select-none">
      <div
        ref={box}
        tabIndex={0}
        role="img"
        aria-label={`${alt} — 360 degree view, drag to rotate`}
        className={`relative aspect-[3/4] bg-stone-50 overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-black ${zoom > 1 ? "cursor-zoom-in" : "cursor-grab"} active:cursor-grabbing touch-pan-y`}
        onPointerDown={(e) => { drag.current = { x: e.clientX, start: idx }; setAuto(false); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          if (drag.current) {
            const d = Math.round((e.clientX - drag.current.x) / PX_PER_FRAME);
            setIdx((((drag.current.start - d) % n) + n) % n);
          } else if (zoom > 1 && box.current) {
            const r = box.current.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); }}
        onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={set[idx].url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom})`, transformOrigin: origin }} />
        <span className="absolute top-3 left-3 bg-white/90 text-[10px] uppercase tracking-widest px-2 py-1">Zoom {Math.round(zoom * 100)}%</span>
        <span className="absolute top-3 right-3 bg-white/90 text-[10px] uppercase tracking-widest px-2 py-1">{viewLabel} {angle}°</span>
        {!ready && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-stone-200"><div className="h-full bg-black transition-all" style={{ width: `${(loaded / n) * 100}%` }} /></div>
        )}
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-3 py-1.5 whitespace-nowrap pointer-events-none">
          Drag to rotate · Double-click to zoom
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => setAuto((a) => !a)} className={`flex items-center gap-1.5 px-3 py-2 border text-[10px] uppercase tracking-widest transition ${auto ? "bg-black text-white border-black" : "border-stone-300 hover:border-black"}`}>
          <RotateCw size={13} className={auto ? "animate-spin" : ""} /> Auto-rotate
        </button>
        <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} aria-label="Zoom out" className="p-2 border border-stone-300 hover:border-black"><ZoomOut size={14} /></button>
        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-black" />
        <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))} aria-label="Zoom in" className="p-2 border border-stone-300 hover:border-black"><ZoomIn size={14} /></button>
      </div>

      <div className="mt-3 flex gap-1.5 flex-wrap">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <button key={a} onClick={() => { setAuto(false); setIdx(Math.round((a / 360) * n) % n); }}
            className={`px-2.5 py-1 text-[10px] border transition ${Math.abs(angle - a) < 360 / n + 1 ? "bg-black text-white border-black" : "border-stone-200 hover:border-black"}`}>
            {a}°
          </button>
        ))}
      </div>
    </div>
  );
}
