"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import type { ProductListItem } from "@/lib/types";

const CARD_W = 220;
const CARD_H = 292;
const MAX_ITEMS = 8;

/**
 * 3D collection stage for the homepage (proposal 3B/3C; "Virtual showroom" references).
 * Featured products stand on pedestals around a rotating ring: drag, use the
 * arrows or the keyboard to walk around it. Pure CSS 3D — no WebGL/model
 * assets — with a plain scrolling row as the fallback for reduced-motion,
 * data-saver and slow connections.
 */
export default function ShowroomStage({ products }: { products: ProductListItem[] }) {
  const items = products.filter((p) => p.image).slice(0, MAX_ITEMS);
  const n = items.length;
  const [active, setActive] = useState(0);
  const [turn, setTurn] = useState(0); // continuous index so rotation never snaps back
  const [static3d, setStatic3d] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const { formatPrice } = useLocalization();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = !!conn && (conn.saveData === true || ["slow-2g", "2g"].includes(conn.effectiveType ?? ""));
    setStatic3d(reduce || slow);
  }, []);

  if (n < 3) return null;

  const step = 360 / n;
  const radius = Math.round((CARD_W / 2 / Math.tan(Math.PI / n)) * 1.25);
  const go = (d: number) => {
    setTurn((t) => t + d);
    setActive((a) => (((a + d) % n) + n) % n);
  };
  const current = items[active];
  const sentenceCase = (value: string) => value.trim().toLowerCase().replace(/^\S/, (letter) => letter.toUpperCase());

  const caption = (
    <div className="mt-6 flex flex-col items-center gap-3 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400">{current.category_name}</p>
        <h3 className="mt-1 font-editorial text-2xl text-white normal-case">{sentenceCase(current.name)}</h3>
        <p className="mt-1 text-sm text-stone-300">{formatPrice(Number(current.price) || 0)}</p>
      </div>
      <div className="flex gap-2">
        <Link href={`/product/${current.slug}`} className="bg-white px-5 py-2.5 text-[11px] uppercase tracking-widest text-black hover:bg-stone-200">View</Link>
        <Link href={`/product/${current.slug}?tryon=1`} className="border border-white/40 px-5 py-2.5 text-[11px] uppercase tracking-widest text-white hover:border-white">Try It On</Link>
      </div>
    </div>
  );

  return (
    <section aria-label="3D collection showroom" className="relative my-6 overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#3a3530_0%,#151311_70%)] px-4 py-10 text-white sm:py-14">
      {/* ceiling light strip, like the gallery-style references */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[12%] top-0 h-1 bg-white/80 shadow-[0_10px_60px_20px_rgba(255,244,225,0.35)]" />

      <div className="mx-auto max-w-5xl text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400">The showroom</p>
        <h2 className="mt-2 font-editorial text-3xl tracking-tight sm:text-5xl">Walk the collection</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">Drag, or use the arrows, to move around this season&apos;s favourites.</p>
      </div>

      {static3d ? (
        <ul className="mx-auto mt-8 flex max-w-5xl snap-x gap-3 overflow-x-auto pb-2">
          {items.map((p) => (
            <li key={p.id} className="w-52 shrink-0 snap-start">
              <Link href={`/product/${p.slug}`} className="block">
                <div className="relative aspect-[3/4] bg-[#f7f5f0]">
                  {p.model_3d_url && <span className="absolute bottom-2 left-2 z-10 bg-black/85 px-2 py-1 text-[9px] uppercase tracking-widest text-white">3D · AR</span>}
                  <Image src={mediaUrl(p.image)} alt={p.name} fill sizes="160px" className="object-contain p-3" />
                </div>
                <p className="mt-2 line-clamp-1 text-xs normal-case">{sentenceCase(p.name)}</p>
                <p className="text-xs text-stone-400">{formatPrice(Number(p.price) || 0)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div
            role="group"
            aria-roledescription="carousel"
            aria-label="Rotate the showroom"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") go(-1);
              if (e.key === "ArrowRight") go(1);
            }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, start: turn }; }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const steps = Math.round((drag.current.x - e.clientX) / 90);
              const target = drag.current.start + steps;
              if (target !== turn) go(target - turn);
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            className="relative mx-auto mt-6 h-[300px] max-w-3xl cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-white/50 sm:h-[340px]"
            style={{ perspective: "1100px" }}
          >
            <div
              className="absolute left-1/2 top-4 h-0 w-0"
              style={{
                transformStyle: "preserve-3d",
                transform: `translateZ(${-radius}px) rotateY(${-turn * step}deg)`,
                transition: "transform 700ms cubic-bezier(.2,.7,.2,1)",
              }}
            >
              {items.map((p, i) => {
                const dist = Math.min(((i - active) % n + n) % n, ((active - i) % n + n) % n);
                return (
                  <div
                    key={p.id}
                    aria-hidden={i !== active}
                    className="absolute"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      left: -CARD_W / 2,
                      transform: `rotateY(${i * step}deg) translateZ(${radius}px)`,
                      backfaceVisibility: "hidden",
                      opacity: dist === 0 ? 1 : dist === 1 ? 0.7 : 0.3,
                      transition: "opacity 500ms",
                    }}
                  >
                    <div className="relative h-full w-full overflow-hidden bg-[#f7f5f0]">
                      <Image src={mediaUrl(p.image)} alt={p.name} fill sizes="220px" className="object-contain p-3" draggable={false} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* floor glow */}
            <div aria-hidden className="pointer-events-none absolute inset-x-[15%] bottom-2 h-10 rounded-[50%] bg-white/10 blur-xl" />
          </div>

          <div className="mx-auto mt-2 flex max-w-3xl items-center justify-center gap-6">
            <button type="button" onClick={() => go(-1)} aria-label="Previous product" className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white ring-1 ring-white/40 hover:ring-white"><ChevronLeft size={20} /></button>
            <span className="text-[11px] tabular-nums tracking-widest text-stone-400">{active + 1} / {n}</span>
            <button type="button" onClick={() => go(1)} aria-label="Next product" className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white ring-1 ring-white/40 hover:ring-white"><ChevronRight size={20} /></button>
          </div>
        </>
      )}

      {caption}
    </section>
  );
}
