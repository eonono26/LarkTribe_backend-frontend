"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag, X } from "lucide-react";
import { createShowroom, type ShowZone } from "@/components/showroom/engine";
import TryOnButton from "@/components/TryOnButton";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import { trackEvent } from "@/lib/tracking";
import { mediaUrl } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

type Engine = ReturnType<typeof createShowroom>;

export default function ShowroomExperience({ products }: { products: ProductListItem[] }) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();
  const [selected, setSelected] = useState<number | null>(null);
  const [zone, setZone] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [hint, setHint] = useState(true);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Group into zones by category: the 4 best-stocked categories, 6 pieces each.
  const zones = useMemo(() => {
    const withImg = products.filter((p) => p.image || p.image_url);
    const groups = new Map<string, ProductListItem[]>();
    withImg.forEach((p) => { const k = p.category_name || "New In"; groups.set(k, [...(groups.get(k) || []), p]); });
    let list = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 4);
    if (list.length === 0) list = [];
    return list.map(([title, items]) => ({ title, items: items.slice(0, 6) }));
  }, [products]);

  const byId = useMemo(() => new Map(zones.flatMap((z) => z.items).map((p) => [Number(p.id), p] as [number, ProductListItem])), [zones]);

  useEffect(() => {
    if (!host.current || zones.length === 0) return;
    const data: ShowZone[] = zones.map((z) => ({
      title: z.title,
      items: z.items.map((p) => ({ id: Number(p.id), name: p.name, priceLabel: formatPrice(parseFloat(p.price) || 0), imageUrl: mediaUrl((p.image || p.image_url) as string) })),
    }));
    try {
      engine.current = createShowroom(host.current, data, {
        onSelect: (id) => { setSelected(id); setAdded(false); if (id != null) setHint(false); },
        onZone: setZone,
        onProgress: (done, total) => setProgress({ done, total }),
      });
    } catch { setFailed(true); }
    return () => { engine.current?.dispose(); engine.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  const item = selected != null ? byId.get(selected) ?? null : null;
  const loading = progress.done < progress.total;

  async function add() {
    if (!item) return;
    setAdding(true);
    try {
      const variant = item.colors?.length ? item.color_variant_ids?.[item.colors[0]] ?? null : null;
      await addItem(Number(item.id), 1, variant);
      trackEvent("AddToCart", { id: item.id, name: item.name, value: parseFloat(item.price) || 0 });
      setAdded(true);
    } finally { setAdding(false); }
  }

  if (failed || zones.length === 0) {
    return (
      <div className="container-shell py-24 text-center">
        <p className="font-editorial text-2xl mb-2">{failed ? "Your browser can't show the 3D store." : "The store is being stocked."}</p>
        <Link href="/shop" className="text-[11px] uppercase tracking-widest underline underline-offset-4">Browse the shop instead</Link>
      </div>
    );
  }

  const canQuickAdd = item && !item.needs_size && (item.colors?.length ? item.color_variant_ids?.[item.colors[0]] != null : true);

  return (
    <div className="relative w-full h-[calc(100vh-var(--header-h,72px))] min-h-[520px] bg-stone-200 overflow-hidden">
      <div ref={host} className="absolute inset-0" />

      {/* zone navigation */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-white/90 backdrop-blur px-1.5 py-1.5 shadow-sm max-w-[94vw] overflow-x-auto">
        {zones.map((z, i) => (
          <button key={z.title} onClick={() => engine.current?.goToZone(i)}
            className={`px-4 py-2 text-[10px] uppercase tracking-widest whitespace-nowrap transition ${zone === i ? "bg-black text-white" : "hover:bg-stone-100"}`}>
            {z.title}
          </button>
        ))}
      </div>

      <Link href="/shop" className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur px-4 py-3 text-[10px] uppercase tracking-widest hover:bg-white shadow-sm hidden sm:block">Grid view</Link>

      {loading && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 bg-white/90 px-4 py-2 text-[11px] tracking-wide shadow-sm">
          Stocking the shelves… {Math.round((progress.done / progress.total) * 100)}%
        </div>
      )}

      {hint && !loading && !item && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/75 text-white px-5 py-3 text-xs text-center max-w-[90vw]" onClick={() => setHint(false)}>
          Drag to look around · Tap the circles to walk · Tap a piece to view it · W A S D to move
        </div>
      )}

      {/* product panel: side on desktop, sheet on mobile (like the rack reference) */}
      {item && (
        <aside className="absolute z-20 bg-white shadow-xl bottom-0 inset-x-0 max-h-[62vh] overflow-y-auto sm:inset-x-auto sm:left-auto sm:right-0 sm:top-0 sm:bottom-auto sm:h-full sm:max-h-none sm:w-[340px]">
          <button onClick={() => { setSelected(null); engine.current?.deselect(); }} aria-label="Close" className="absolute top-3 right-3 p-1.5 hover:bg-stone-100"><X size={16} /></button>
          <div className="p-5 sm:p-6">
            <Link href={`/product/${item.slug}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl((item.image || item.image_url) as string)} alt={item.name} className="w-full max-h-72 sm:max-h-none sm:aspect-[4/5] object-cover mb-4" />
            </Link>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{item.category_name}</p>
            <h2 className="font-editorial text-xl mt-1">{item.name}</h2>
            <p className="mt-1 text-sm">{formatPrice(parseFloat(item.price) || 0)}</p>
            <div className="mt-5 space-y-2">
              {canQuickAdd ? (
                <button onClick={add} disabled={adding} className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
                  <ShoppingBag size={14} /> {added ? "Added to bag ✓" : adding ? "Adding…" : "Add to bag"}
                </button>
              ) : (
                <Link href={`/product/${item.slug}`} className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                  Choose size <ArrowRight size={14} />
                </Link>
              )}
              <TryOnButton variant="solid" product={{ id: item.id, name: item.name, slug: item.slug, colors: item.colors }} />
              <Link href={`/product/${item.slug}`} className="block text-center text-[11px] uppercase tracking-widest underline underline-offset-4 pt-2">Full details</Link>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
