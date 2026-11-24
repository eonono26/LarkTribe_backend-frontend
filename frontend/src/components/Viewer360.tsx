"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

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
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
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
  const angle = Math.round((idx / n) * 360) % 360;
  const viewLabel = angle < 23 || angle >= 338 ? "Front View" : angle < 68 ? "Front ¾ View" : angle < 113 ? "Side View" : angle < 158 ? "Back ¾ View" : angle < 203 ? "Back View" : angle < 248 ? "Back ¾ View" : angle < 293 ? "Side View" : "Front ¾ View";
  const jump = (a: number) => { setAuto(false); setIdx((((Math.round((a / 360) * n)) % n) + n) % n); };
  const clampZoom = (z: number) => Math.min(2, Math.max(0.5, +z.toFixed(2)));
  const pill = "px-3 py-1.5 text-[11px] bg-white border border-stone-200 rounded-md hover:border-stone-400 transition";

  return (
    <div className="w-full select-none">
      <div className="bg-stone-50 p-3 sm:p-4 rounded-xl">
        <div
          ref={box}
          tabIndex={0}
          role="img"
          aria-label={`${alt} — 360 degree view, drag to rotate`}
          className="relative aspect-square bg-stone-100 overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-black cursor-grab active:cursor-grabbing touch-pan-y"
          onPointerDown={(e) => {
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; drag.current = null; }
            else { drag.current = { x: e.clientX, start: idx }; }
            setAuto(false); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinch.current && pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()];
              setZoom(clampZoom(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d)));
            } else if (drag.current) {
              const d = Math.round((e.clientX - drag.current.x) / PX_PER_FRAME);
              setIdx((((drag.current.start - d) % n) + n) % n);
            } else if (zoom > 1 && box.current) {
              const r = box.current.getBoundingClientRect();
              setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            }
          }}
          onPointerUp={(e) => { pointers.current.delete(e.pointerId); pinch.current = null; drag.current = null; }}
          onPointerCancel={(e) => { pointers.current.delete(e.pointerId); pinch.current = null; drag.current = null; }}
          onKeyDown={(e) => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); }}
          onDoubleClick={() => { setZoom(1); setOrigin("50% 50%"); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={set[idx].url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain transition-transform duration-150"
            style={{ transform: `scale(${zoom})`, transformOrigin: origin }} />
          <span className="absolute top-3 left-3 bg-white/95 text-[11px] px-2.5 py-1.5 rounded-md shadow-sm">Zoom: {Math.round(zoom * 100)}%</span>
          <span className="absolute top-3 right-3 bg-white/95 text-[11px] px-2.5 py-1.5 rounded-md shadow-sm text-center leading-tight">{viewLabel}<br /><span className="text-stone-500">{angle}°</span></span>
          {!ready && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-stone-200"><div className="h-full bg-black transition-all" style={{ width: `${(loaded / n) * 100}%` }} /></div>
          )}
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-stone-800/85 text-white text-[11px] px-3 py-2 rounded-md text-center max-w-[80%] leading-snug pointer-events-none">
            Drag to rotate • Double-click to reset zoom • Pinch to zoom on mobile
          </span>
        </div>
      </div>

      {/* Zoom panel */}
      <div className="mt-4 bg-white border border-stone-200 rounded-lg p-4">
        <p className="flex items-center gap-2 text-sm mb-3"><ZoomIn size={14} /> Zoom</p>
        <input type="range" min={0.5} max={2} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="w-full accent-black" />
        <div className="flex justify-between text-[11px] text-stone-500 mt-1"><span>50%</span><span>100%</span><span>200%</span></div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setZoom((z) => clampZoom(z - 0.25))} aria-label="Zoom out" className="p-2 border border-stone-200 rounded-md hover:border-stone-400"><ZoomOut size={14} /></button>
          <button onClick={() => { setZoom(1); setOrigin("50% 50%"); }} className="flex-1 py-2 border border-stone-200 rounded-md text-xs hover:border-stone-400">Reset</button>
          <button onClick={() => setZoom((z) => clampZoom(z + 0.25))} aria-label="Zoom in" className="p-2 border border-stone-200 rounded-md hover:border-stone-400"><ZoomIn size={14} /></button>
        </div>
      </div>

      {/* Rotation controls: ‹ -45° | Auto Rotate | +45° › */}
      <div className="mt-5 flex items-center justify-center gap-2">
        <button onClick={() => { setAuto(false); step(-Math.max(1, Math.round(n / 8))); }} className={`${pill} inline-flex items-center gap-1`}><ChevronLeft size={13} /> -45°</button>
        <button onClick={() => setAuto((a) => !a)} className={`${pill} inline-flex items-center gap-1.5 ${auto ? "!bg-black !text-white !border-black" : ""}`}><RotateCw size={13} className={auto ? "animate-spin" : ""} /> Auto Rotate</button>
        <button onClick={() => { setAuto(false); step(Math.max(1, Math.round(n / 8))); }} className={`${pill} inline-flex items-center gap-1`}>+45° <ChevronRight size={13} /></button>
      </div>
      <div className="mt-3 flex justify-center">
        <div className="inline-flex gap-1 bg-stone-100 rounded-lg p-1 flex-wrap justify-center">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <button key={a} onClick={() => jump(a)}
              className={`px-2.5 py-1.5 text-[11px] rounded-md transition ${Math.abs(angle - a) <= 360 / n ? "bg-white shadow-sm" : "text-stone-600 hover:bg-white/60"}`}>
              {a}°
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
