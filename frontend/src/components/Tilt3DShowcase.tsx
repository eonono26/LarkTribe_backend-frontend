"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import QuickViewModal from "@/components/QuickViewModal";
import TryOnButton from "@/components/TryOnButton";
import type { ProductListItem } from "@/lib/types";

const ringEnabled = () =>
  window.matchMedia("(min-width: 768px)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeRingEnabled = (notify: () => void) => {
  const desktop = window.matchMedia("(min-width: 768px)");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  desktop.addEventListener("change", notify);
  motion.addEventListener("change", notify);
  return () => {
    desktop.removeEventListener("change", notify);
    motion.removeEventListener("change", notify);
  };
};

/**
 * 3D collection ring: product cards arranged on a rotating cylinder (CSS 3D, no
 * WebGL, no extra dependency). Drag to spin; slow auto-spin when idle.
 * Honours prefers-reduced-motion and falls back to a plain scroll row on small screens.
 */
export default function Tilt3DShowcase({ products, title = "The Collection, in the Round" }: { products: ProductListItem[]; title?: string }) {
  const items = products.filter((p) => p.image || p.image_url).slice(0, 16);
  const [angle, setAngle] = useState(0);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const drag = useRef<{ x: number; a: number } | null>(null);
  const paused = useRef(false);
  const { formatPrice } = useLocalization();
  const enabled = useSyncExternalStore(subscribeRingEnabled, ringEnabled, () => false);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => { if (!paused.current) setAngle((a) => a - 0.12); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (items.length < 4) return null;
  const step = 360 / items.length;
  const radius = 620;
  const card = (p: ProductListItem, i: number, ring: boolean) => {
    const image = p.image || p.image_url;
    if (!image) return null;
    return (
      <article
        key={p.id}
        className={`group relative ${ring ? "absolute left-1/2 top-1/2 -ml-[125px] -mt-[190px] h-[380px] w-[250px]" : "w-44 shrink-0 snap-start"}`}
        style={ring ? { transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, backfaceVisibility: "hidden" } : undefined}
      >
        <Link href={`/product/${p.slug}`} className={`relative block overflow-hidden ${ring ? "h-full w-full" : "aspect-[3/4] w-full"}`}>
          <Image
            src={mediaUrl(image)}
            alt={p.name}
            fill
            sizes={ring ? "220px" : "176px"}
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
            <p className="truncate text-[10px] uppercase tracking-[0.16em]">{p.name}</p>
            <p className="mt-1 text-xs">{formatPrice(Number(p.price) || 0)}</p>
          </div>
        </Link>
        <div className="absolute inset-x-2 bottom-14 z-10 flex items-center justify-center gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewSlug(p.slug); }}
            className="bg-white/90 px-3 py-2 text-[9px] uppercase tracking-wider text-black hover:bg-white"
          >
            Quick view
          </button>
          <TryOnButton
            product={{ id: p.id, name: p.name, slug: p.slug, colors: p.colors }}
            label=""
            className="h-8 w-8 rounded-full !border-0 bg-white/90 !py-0 text-black hover:bg-white"
          />
        </div>
      </article>
    );
  };

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-10" aria-label={title}>
      <h2 className="font-editorial text-3xl lg:text-4xl tracking-tight text-center mb-2">{title}</h2>
      <p className="text-center text-[11px] uppercase tracking-[0.2em] text-stone-500 mb-6">{enabled ? "Drag to spin" : "Swipe to explore"}</p>

      {enabled ? (
        <div
          className="relative mx-auto h-[620px] w-full cursor-grab select-none active:cursor-grabbing touch-pan-y"
          style={{ perspective: "1600px" }}
          onPointerDown={(e) => { drag.current = { x: e.clientX, a: angle }; paused.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (drag.current) setAngle(drag.current.a + (e.clientX - drag.current.x) * 0.3); }}
          onPointerUp={() => { drag.current = null; paused.current = false; }}
          onMouseEnter={() => { paused.current = true; }}
          onMouseLeave={() => { paused.current = false; drag.current = null; }}
        >
          <div className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transformStyle: "preserve-3d", transform: `translateZ(-${radius}px) rotateY(${angle}deg)` }}>
            {items.map((p, i) => card(p, i, true))}
          </div>
        </div>
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:px-8">
          {items.map((p, i) => card(p, i, false))}
        </div>
      )}
      {quickViewSlug && <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />}
    </section>
  );
}
