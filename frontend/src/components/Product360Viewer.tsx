"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Pause, Play, Plus, RotateCw, X } from "lucide-react";

export type Frame = { url: string; label: string };

type Props = {
  productName: string;
  /** Ordered angle photos for the selected colour (front → side → back …). */
  frames: Frame[];
  colors?: string[];
  color?: string | null;
  onColorChange?: (c: string) => void;
  sizes?: string[];
  size?: string | null;
  onSizeChange?: (s: string) => void;
  priceLabel?: string;
};

/** A colour needs at least this many distinct angle photos to get a 360° view. */
export const MIN_360_FRAMES = 3;

const PX_PER_FRAME = 70;

/**
 * Drag-to-rotate product viewer (proposal 3A, reference "360° Interactive Product View").
 * It scrubs through real multi-angle photos — nothing is faked for products
 * that only have a single photo, so the entry button is hidden for those.
 */
export default function Product360Viewer({
  productName, frames, colors = [], color, onColorChange, sizes = [], size, onSizeChange, priceLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [auto, setAuto] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const n = frames.length;

  const wrap = useCallback((i: number) => ((i % n) + n) % n, [n]);

  // Reset when the colour (and so the frame set) changes.
  useEffect(() => { setIndex(0); setZoom(100); }, [color, n]);

  useEffect(() => {
    if (!open || !auto) return;
    const t = setInterval(() => setIndex((i) => wrap(i + 1)), 900);
    return () => clearInterval(t);
  }, [open, auto, wrap]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") setIndex((i) => wrap(i - 1));
      if (e.key === "ArrowRight") setIndex((i) => wrap(i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, wrap]);

  if (n < MIN_360_FRAMES) return null;
  const degrees = Math.round((index / n) * 360);

  return (
    <>
      <button
        type="button"
        onClick={() => { setAuto(false); setOpen(true); }}
        className="inline-flex w-full items-center justify-center gap-2 border border-stone-300 py-3 text-[11px] uppercase tracking-[0.16em] font-medium transition hover:border-black"
      >
        <RotateCw size={14} /> 360° view
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 sm:p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label={`${productName} 360° view`} className="relative h-full w-full max-w-4xl overflow-y-auto bg-white p-5 sm:h-auto sm:max-h-[94vh] sm:p-8">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close 360° view" className="absolute right-4 top-4 p-2 text-stone-500 hover:text-black"><X size={20} /></button>
            <p className="text-center text-[10px] uppercase tracking-[0.22em] text-stone-500">360° interactive view</p>
            <h2 className="mt-1 text-center font-editorial text-2xl">{productName}</h2>
            <p className="mt-1 text-center text-xs text-stone-500">{[color, size && `Size ${size}`, priceLabel].filter(Boolean).join(" · ")}</p>

            <div className="mt-5 grid gap-5 md:grid-cols-[200px_1fr]">
              <div className="order-2 space-y-5 md:order-1">
                {colors.length > 1 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-stone-500">Colour</p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <button key={c} type="button" onClick={() => onColorChange?.(c)} aria-pressed={color === c} className={`border px-3 py-2 text-xs ${color === c ? "border-black bg-stone-50" : "border-stone-200"}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-stone-500">Size</p>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((s) => (
                        <button key={s} type="button" onClick={() => onSizeChange?.(s)} aria-pressed={size === s} className={`min-w-10 border px-3 py-2 text-xs ${size === s ? "border-black bg-stone-50" : "border-stone-200"}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-stone-500">Zoom · {zoom}%</p>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(100, z - 25))} className="border border-stone-200 p-2"><Minus size={14} /></button>
                    <input type="range" min={100} max={250} step={5} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="w-full accent-black" />
                    <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(250, z + 25))} className="border border-stone-200 p-2"><Plus size={14} /></button>
                  </div>
                  <button type="button" onClick={() => setZoom(100)} className="mt-2 inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-black"><Maximize2 size={12} />Reset</button>
                </div>
              </div>

              <div className="order-1 md:order-2">
                <div
                  className="relative aspect-[4/5] w-full cursor-grab touch-pan-y select-none overflow-hidden bg-stone-100 active:cursor-grabbing"
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, start: index }; setAuto(false); }}
                  onPointerMove={(e) => {
                    if (!drag.current) return;
                    const steps = Math.round((drag.current.x - e.clientX) / PX_PER_FRAME);
                    setIndex(wrap(drag.current.start + steps));
                  }}
                  onPointerUp={() => { drag.current = null; }}
                  onPointerCancel={() => { drag.current = null; }}
                  onDoubleClick={() => setZoom(100)}
                  onWheel={(e) => setZoom((z) => Math.min(250, Math.max(100, z - Math.sign(e.deltaY) * 10)))}
                >
                  {frames.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.url}
                      src={f.url}
                      alt={i === index ? `${productName}, ${f.label} view` : ""}
                      aria-hidden={i !== index}
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
                      style={{ opacity: i === index ? 1 : 0, transform: `scale(${zoom / 100})` }}
                    />
                  ))}
                  <span className="absolute right-3 top-3 bg-white/90 px-2 py-1 text-[10px] uppercase tracking-widest">{frames[index].label} · {degrees}°</span>
                  <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-max max-w-[90%] bg-black/70 px-3 py-1.5 text-center text-[11px] text-white">
                    Drag to rotate · Double-click to reset zoom · Scroll to zoom
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setIndex((i) => wrap(i - 1))} className="border border-stone-200 px-3 py-2 text-xs hover:border-black" aria-label="Previous angle">‹ Prev</button>
                  <button type="button" onClick={() => setAuto((a) => !a)} className="inline-flex items-center gap-1 border border-stone-200 px-3 py-2 text-xs hover:border-black">
                    {auto ? <Pause size={12} /> : <Play size={12} />} Auto rotate
                  </button>
                  <button type="button" onClick={() => setIndex((i) => wrap(i + 1))} className="border border-stone-200 px-3 py-2 text-xs hover:border-black" aria-label="Next angle">Next ›</button>
                </div>
                <div className="mt-2 flex justify-center gap-1.5" role="group" aria-label="Choose angle">
                  {frames.map((f, i) => (
                    <button key={f.url} type="button" onClick={() => setIndex(i)} aria-label={`${f.label} view`} aria-current={i === index} className={`h-1.5 w-6 ${i === index ? "bg-black" : "bg-stone-300"}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
