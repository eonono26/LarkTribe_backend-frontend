"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

/**
 * 3D collection ring: product cards arranged on a rotating cylinder (CSS 3D, no
 * WebGL, no extra dependency). Drag to spin; slow auto-spin when idle.
 * Honours prefers-reduced-motion and falls back to a plain scroll row on small screens.
 */
export default function Tilt3DShowcase({ products, title = "The Collection, in the Round" }: { products: ProductListItem[]; title?: string }) {
  const items = products.filter((p) => p.image || p.image_url).slice(0, 8);
  const [angle, setAngle] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const drag = useRef<{ x: number; a: number } | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    const ok = window.matchMedia("(min-width: 768px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(ok);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => { if (!paused.current) setAngle((a) => a - 0.12); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (items.length < 4) return null;
  const step = 360 / items.length;
  const radius = 360;

  return (
    <section className="container-shell py-8 overflow-hidden" aria-label={title}>
      <h2 className="font-editorial text-3xl lg:text-4xl tracking-tight text-center mb-2">{title}</h2>
      <p className="text-center text-[11px] uppercase tracking-[0.2em] text-stone-500 mb-6">{enabled ? "Drag to spin" : "Swipe to explore"}</p>

      {enabled ? (
        <div
          className="relative h-[460px] cursor-grab active:cursor-grabbing select-none touch-pan-y"
          style={{ perspective: "1400px" }}
          onPointerDown={(e) => { drag.current = { x: e.clientX, a: angle }; paused.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (drag.current) setAngle(drag.current.a + (e.clientX - drag.current.x) * 0.3); }}
          onPointerUp={() => { drag.current = null; paused.current = false; }}
          onMouseEnter={() => { paused.current = true; }}
          onMouseLeave={() => { paused.current = false; drag.current = null; }}
        >
          <div className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transformStyle: "preserve-3d", transform: `translateZ(-${radius}px) rotateY(${angle}deg)` }}>
            {items.map((p, i) => (
              <Link key={p.id} href={`/product/${p.slug}`} draggable={false}
                className="absolute block w-[190px] h-[260px] -ml-[95px] -mt-[130px] bg-white border border-stone-200 shadow-[0_20px_40px_-20px_rgba(0,0,0,.35)]"
                style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, backfaceVisibility: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl((p.image || p.image_url) as string)} alt={p.name} draggable={false} className="w-full h-[215px] object-cover" />
                <span className="block px-2 py-1.5 text-[10px] uppercase tracking-wider truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-4 px-4">
          {items.map((p) => (
            <Link key={p.id} href={`/product/${p.slug}`} className="snap-start shrink-0 w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl((p.image || p.image_url) as string)} alt={p.name} className="w-full aspect-[3/4] object-cover" />
              <span className="block mt-1.5 text-[10px] uppercase tracking-wider truncate">{p.name}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
