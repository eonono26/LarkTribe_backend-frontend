"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist-context";
import { useLocalization } from "@/lib/localization-context";
import QuickViewModal from "@/components/QuickViewModal";
import TryOnButton from "@/components/TryOnButton";
import type { ProductListItem } from "@/lib/types";

/** A responsive CSS 3D product ring. Pointer dragging works with mouse, pen and touch. */
export default function Tilt3DShowcase({
  products,
  title = "The Collection, in the Round",
}: {
  products: ProductListItem[];
  title?: string;
}) {
  const items = products.filter((product) => product.image || product.image_url).slice(0, 12);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const [wishlistBusy, setWishlistBusy] = useState<number | null>(null);
  const [wishlistError, setWishlistError] = useState("");
  const [radius, setRadius] = useState(220);
  const [activeIndex, setActiveIndex] = useState(0);
  const ringRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const drag = useRef<{ x: number; angle: number } | null>(null);
  const dragged = useRef(false);
  const hovering = useRef(false);
  const { isSaved, toggle: toggleWishlistItem } = useWishlist();
  const { formatPrice } = useLocalization();

  useEffect(() => {
    const resize = () => {
      const width = window.innerWidth;
      setRadius(Math.max(190, Math.min(500, width * (width < 640 ? 0.49 : 0.38))));
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);

  function applyAngle(next: number) {
    angle.current = next;
    if (ringRef.current) ringRef.current.style.transform = `rotateY(${next}deg)`;
    const step = 360 / items.length;
    const index = ((Math.round(-next / step) % items.length) + items.length) % items.length;
    setActiveIndex(index);
  }

  useEffect(() => {
    if (items.length < 4) return;
    let frame = 0;
    let previous = 0;
    let lastLabel = 0;
    const tick = (time: number) => {
      if (previous && !drag.current && !hovering.current) {
        const delta = Math.min((time - previous) / 1000, 0.05);
        angle.current -= delta * 5;
        if (ringRef.current) ringRef.current.style.transform = 'rotateY(' + angle.current + 'deg)';
        if (time - lastLabel > 250) {
          const step = 360 / items.length;
          const index = ((Math.round(-angle.current / step) % items.length) + items.length) % items.length;
          setActiveIndex(index);
          lastLabel = time;
        }
      }
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [items.length]);

  function rotate(direction: number) {
    applyAngle(angle.current - direction * (360 / items.length));
  }

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

  const card = (product: ProductListItem, index: number) => {
    const image = product.image || product.image_url;
    if (!image) return null;
    const productId = Number(product.id);
    const saved = isSaved(productId);
    return (
      <article
        key={product.id}
        className="lark-round-card group absolute left-1/2 top-1/2 w-[clamp(160px,22vw,280px)]"
        style={{
          height: "clamp(240px,32vw,400px)",
          transform: `translate(-50%, -50%) rotateY(${index * step}deg) translateZ(${radius}px)`,
          backfaceVisibility: "hidden",
        }}
      >
        <Link
          href={`/product/${product.slug}`}
          className="relative block h-full w-full overflow-hidden bg-[#f7f5f0]"
        >
          <Image
            src={mediaUrl(image)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 160px, (max-width: 1100px) 240px, 280px"
            className="object-contain p-3 sm:p-4"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left text-white">
            <p className="truncate text-[10px] tracking-[0.13em]">{product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}</p>
            <p className="mt-1 text-xs">{formatPrice(Number(product.price) || 0)}</p>
          </div>
        </Link>

        <div className="lark-round-actions absolute inset-x-1 bottom-3 z-10 flex items-center justify-center gap-1.5 sm:inset-x-2 sm:gap-2">
          <button
            type="button"
            onClick={() => setQuickViewSlug(product.slug)}
            className="rounded-full bg-white/95 px-2.5 py-2 text-[9px] uppercase tracking-wider text-black shadow-sm transition hover:-translate-y-0.5 hover:bg-white sm:px-3"
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
    <section className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#f3f0eb_0%,#fff_68%)] py-10 sm:py-14" aria-label={title}>
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8">
        <h2 className="text-center font-editorial text-3xl tracking-tight sm:text-4xl">{title}</h2>
        <p className="mb-2 mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-stone-500">
          Drag to spin
        </p>
      </div>

      <div
        className="relative mx-auto h-[clamp(330px,42vw,560px)] w-full cursor-grab touch-pan-y select-none active:cursor-grabbing" onPointerEnter={() => { hovering.current = true; }} onPointerLeave={() => { hovering.current = false; }}
        style={{ perspective: "1400px", perspectiveOrigin: "50% 45%" }}
        role="group"
        aria-roledescription="carousel"
        aria-label="Drag horizontally to rotate the product collection"
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          drag.current = { x: event.clientX, angle: angle.current };
          dragged.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const delta = event.clientX - drag.current.x;
          if (Math.abs(delta) > 4) dragged.current = true;
          applyAngle(drag.current.angle + delta * 0.42);
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
        onClickCapture={(event) => {
          if (dragged.current) {
            event.preventDefault();
            event.stopPropagation();
            dragged.current = false;
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") rotate(-1);
          if (event.key === "ArrowRight") rotate(1);
        }}
        tabIndex={0}
      >
        <div
          ref={ringRef}
          className="absolute left-1/2 top-1/2 h-0 w-0"
          style={{ transformStyle: "preserve-3d", transform: "rotateY(0deg)" }}
        >
          {items.map(card)}
        </div>
      </div>

      <div className="mx-auto -mt-1 flex w-full max-w-[1600px] items-center justify-center gap-6 px-4 sm:px-8">
        <button type="button" onClick={() => rotate(-1)} aria-label="Previous product" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-black transition hover:bg-black hover:text-white">
          <ChevronLeft size={19} />
        </button>
        <span className="min-w-14 text-center text-[11px] tabular-nums tracking-widest text-stone-500">
          {activeIndex + 1} / {items.length}
        </span>
        <button type="button" onClick={() => rotate(1)} aria-label="Next product" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-black transition hover:bg-black hover:text-white">
          <ChevronRight size={19} />
        </button>
      </div>

      {wishlistError && <p role="status" className="mt-3 text-center text-xs text-red-700">{wishlistError}</p>}
      {quickViewSlug && <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />}
    </section>
  );
}
