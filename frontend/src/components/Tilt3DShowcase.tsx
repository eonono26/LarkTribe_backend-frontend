"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist-context";
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

/** A broad, touch-friendly mobile carousel and a pointer-driven CSS 3D ring on desktop. */
export default function Tilt3DShowcase({
  products,
  title = "The Collection, in the Round",
}: {
  products: ProductListItem[];
  title?: string;
}) {
  const items = products.filter((product) => product.image || product.image_url).slice(0, 12);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const { isSaved, toggle: toggleWishlistItem } = useWishlist();
  const [wishlistBusy, setWishlistBusy] = useState<number | null>(null);
  const [wishlistError, setWishlistError] = useState("");
  const [radius, setRadius] = useState(520);
  const ringRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const drag = useRef<{ x: number; angle: number } | null>(null);
  const paused = useRef(false);
  const dragged = useRef(false);
  const { formatPrice } = useLocalization();
  const enabled = useSyncExternalStore(subscribeRingEnabled, ringEnabled, () => false);

  useEffect(() => {
    const resize = () => setRadius(Math.max(380, Math.min(620, window.innerWidth * 0.52)));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!enabled || !ringRef.current) return;
    let raf = 0;
    const render = () => {
      if (!paused.current && !drag.current) angle.current -= 0.08;
      if (ringRef.current) {
        ringRef.current.style.transform = `translateZ(-${radius}px) rotateY(${angle.current}deg)`;
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [enabled, radius, items.length]);

  async function toggleWishlist(productId: number) {
    if (wishlistBusy === productId) return;
    if (!isLoggedIn()) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setWishlistBusy(productId);
    setWishlistError("");
    try {
      await toggleWishlistItem(productId);
    } catch (error) {
      setWishlistError(error instanceof Error ? error.message : "Couldn't update your wishlist.");
    } finally {
      setWishlistBusy(null);
    }
  }

  if (items.length < 4) return null;
  const step = 360 / items.length;

  const card = (product: ProductListItem, index: number, inRing: boolean) => {
    const image = product.image || product.image_url;
    if (!image) return null;
    const productId = Number(product.id);
    const saved = isSaved(productId);
    return (
      <article
        key={product.id}
        className={`group relative shrink-0 bg-[#f7f5f0] ${inRing
          ? "absolute left-1/2 top-1/2 h-[clamp(320px,32vw,420px)] w-[clamp(220px,23vw,300px)]"
          : "w-52 snap-start sm:w-60"}`}
        style={inRing ? {
          transform: `translate(-50%, -50%) rotateY(${index * step}deg) translateZ(${radius}px)`,
          backfaceVisibility: "hidden",
        } : undefined}
      >
        <Link
          href={`/product/${product.slug}`}
          className={`relative block overflow-hidden bg-[#f7f5f0] ${inRing ? "h-[clamp(320px,32vw,420px)] w-full" : "aspect-[3/4] w-full"}`}
        >
          <Image
            src={mediaUrl(image)}
            alt={product.name}
            fill
            sizes={inRing ? "(max-width: 1100px) 240px, 300px" : "(max-width: 640px) 208px, 240px"}
            className="object-contain p-4"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left text-white">
            <p className="truncate text-[10px] uppercase tracking-[0.13em]">{product.name}</p>
            <p className="mt-1 text-xs">{formatPrice(Number(product.price) || 0)}</p>
          </div>
        </Link>

        <div className="lark-round-actions absolute inset-x-2 bottom-14 z-10 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setQuickViewSlug(product.slug)}
            className="rounded-full bg-white/95 px-3 py-2 text-[9px] uppercase tracking-wider text-black shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          >
            Quick view
          </button>
          <TryOnButton
            product={{ id: product.id, name: product.name, slug: product.slug, colors: product.colors }}
            label=""
            className="h-9 w-9 rounded-full !border-0 bg-white/95 !py-0 text-black shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          />
          <button
            type="button"
            onClick={() => void toggleWishlist(productId)}
            disabled={wishlistBusy === productId}
            aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={saved}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:opacity-50"
          >
            <Heart size={15} className={saved ? "fill-current" : ""} />
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-12 sm:py-14" aria-label={title}>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8">
        <h2 className="text-center font-editorial text-3xl tracking-tight sm:text-4xl">{title}</h2>
        <p className="mb-7 mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-stone-500">
          {enabled ? "Drag to spin" : "Swipe to explore"}
        </p>
      </div>

      {enabled ? (
        <div
          className="relative mx-auto h-[clamp(420px,48vw,640px)] w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
          style={{ perspective: `clamp(1000px, 125vw, 1700px)` }}
          onPointerDown={(event) => {
            if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
            drag.current = { x: event.clientX, angle: angle.current };
            dragged.current = false;
            paused.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const delta = event.clientX - drag.current.x;
            if (Math.abs(delta) > 5) dragged.current = true;
            angle.current = drag.current.angle + delta * 0.32;
            if (ringRef.current) ringRef.current.style.transform = `translateZ(-${radius}px) rotateY(${angle.current}deg)`;
          }}
          onPointerUp={() => { drag.current = null; paused.current = false; }}
          onPointerCancel={() => { drag.current = null; paused.current = false; }}
          onLostPointerCapture={() => { drag.current = null; paused.current = false; }}
          onMouseEnter={() => { paused.current = true; }}
          onMouseLeave={() => { if (!drag.current) paused.current = false; }}
          onClickCapture={(event) => {
            if (dragged.current) {
              event.preventDefault();
              event.stopPropagation();
              dragged.current = false;
            }
          }}
          aria-label="Drag horizontally to rotate the product collection"
        >
          <div ref={ringRef} className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transformStyle: "preserve-3d" }}>
            {items.map((product, index) => card(product, index, true))}
          </div>
        </div>
      ) : (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-8">
          {items.map((product, index) => card(product, index, false))}
        </div>
      )}

      {wishlistError && <p role="status" className="mt-2 text-center text-xs text-red-700">{wishlistError}</p>}
      {quickViewSlug && <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />}
    </section>
  );
}
