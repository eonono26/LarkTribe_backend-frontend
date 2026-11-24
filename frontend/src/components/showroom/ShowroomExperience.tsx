"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, Minus, Plus, RotateCw, ShoppingBag, X } from "lucide-react";
import { createShowroom, type InspectView, type ShowWing } from "@/components/showroom/engine";
import { backImage, productImage, type StoreWing } from "@/components/showroom/data";
import TryOnButton from "@/components/TryOnButton";
import QuickViewModal from "@/components/QuickViewModal";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import { trackEvent } from "@/lib/tracking";
import { api, apiErrorMessage } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

type Engine = ReturnType<typeof createShowroom>;

export default function ShowroomExperience({ wings }: { wings: StoreWing[] }) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();
  const [selected, setSelected] = useState<ProductListItem | null>(null);
  const [loc, setLoc] = useState({ w: 0, b: 0 });
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [hint, setHint] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<{ p: ProductListItem; x: number; y: number } | null>(null);
  const [quick, setQuick] = useState<ProductListItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState("");
  const [view, setView] = useState<InspectView>("front");
  const [hasTrue360, setHasTrue360] = useState(false);

  const byId = useMemo(() => new Map(wings.flatMap((w) => w.bays.flatMap((b) => b.products)).map((p) => [Number(p.id), p] as [number, ProductListItem])), [wings]);

  useEffect(() => {
    if (!host.current || wings.length === 0) return;
    const data: ShowWing[] = wings.map((w) => ({
      title: w.title, subtitle: w.subtitle, accent: w.accent,
      bays: w.bays.map((b) => ({
        title: b.title,
        items: b.products.map((p) => ({ id: Number(p.id), slug: p.slug, name: p.name, priceLabel: formatPrice(parseFloat(p.price) || 0), imageUrl: productImage(p), backUrl: backImage(p) })),
      })),
    }));
    try {
      engine.current = createShowroom(host.current, data, {
        onSelect: (id) => { const p = byId.get(id); if (!p) return; setSelected(p); setAdded(false); setErr(""); setView("front"); setHint(false); setHover(null); },
        onLocation: (w, b) => setLoc({ w, b }),
        onHover: (id, x, y) => { const p = id != null ? byId.get(id) : null; setHover(p ? { p, x, y } : null); },
        onProgress: (done, total) => setProgress({ done, total }),
      });
    } catch { void Promise.resolve().then(() => setFailed(true)); }
    return () => { engine.current?.dispose(); engine.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wings]);

  // Start inspecting when a piece is picked; use its API GLB model or 360 turntable frames when available.
  useEffect(() => {
    if (!selected || !engine.current) return;
    const id = Number(selected.id);
    engine.current.inspect(id);
    setHasTrue360(false);
    let alive = true;
    api.product(selected.slug).then((d) => {
      if (!alive) return;
      const color = selected.colors?.[0] ?? "";
      const spinFrames = (d.spin_frames ?? [])
        .filter((frame) => !frame.color || frame.color === color)
        .map((frame) => frame.url);
      const has360 = Boolean(d.model_3d_url || spinFrames.length > 1);
      setHasTrue360(has360);
      if (has360) engine.current?.inspect(id, d.model_3d_url, spinFrames);
    }).catch(() => {});
    return () => { alive = false; };
  }, [selected]);

  const close = () => { engine.current?.closeInspect(); setSelected(null); };
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && !quick && close(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [quick]);

  const loading = progress.done < progress.total;
  const wing = wings[loc.w];

  async function add() {
    if (!selected) return;
    setAdding(true); setErr("");
    try {
      const variant = selected.colors?.length ? selected.color_variant_ids?.[selected.colors[0]] ?? null : null;
      await addItem(Number(selected.id), 1, variant);
      trackEvent("AddToCart", { id: selected.id, name: selected.name, value: parseFloat(selected.price) || 0 });
      setAdded(true);
    } catch (e) { setErr(apiErrorMessage(e, "Couldn't add this to your bag.")); } finally { setAdding(false); }
  }

  if (failed || wings.length === 0) {
    return (
      <div className="container-shell py-24 text-center">
        <p className="font-editorial text-2xl mb-2">{failed ? "Your browser can't show the 3D store." : "The store is being stocked."}</p>
        <Link href="/shop" className="text-[11px] uppercase tracking-widest underline underline-offset-4">Browse the shop instead</Link>
      </div>
    );
  }

  const canQuickAdd = selected && !selected.needs_size && (selected.colors?.length ? selected.color_variant_ids?.[selected.colors[0]] != null : true);
  const chip = "px-4 py-2 text-[10px] uppercase tracking-widest whitespace-nowrap transition";
  const views: { k: InspectView; label: string }[] = [{ k: "front", label: "Front" }, { k: "right", label: "Side" }, { k: "back", label: "Back" }, { k: "left", label: "Side" }, { k: "top", label: "Top" }];

  return (
    <div className="relative w-full h-[calc(100vh-var(--header-h,72px))] min-h-[520px] bg-stone-200 overflow-hidden select-none">
      <div ref={host} className="absolute inset-0" />

      {/* departments, in shopping order */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[96vw]">
        <div className="flex max-w-full items-center gap-1 bg-white/95 p-1.5 shadow-md backdrop-blur overflow-x-auto">
          {wings.map((w, i) => (
            <button key={w.slug} onClick={() => { close(); engine.current?.goToWing(i); }} className={`${chip} ${loc.w === i ? "text-white" : "hover:bg-stone-100"}`} style={loc.w === i ? { background: "#" + w.accent.toString(16).padStart(6, "0") } : undefined}>
              {w.title}
            </button>
          ))}
        </div>
        {wing && (
          <div className="flex max-w-full items-center gap-1 bg-white/90 p-1.5 shadow-md backdrop-blur overflow-x-auto">
            {wing.bays.map((b, i) => (
              <button key={b.title} onClick={() => { close(); engine.current?.goToBay(loc.w, i); }} className={`${chip} !py-1.5 ${loc.b === i ? "bg-black text-white" : "hover:bg-stone-100"}`}>{b.title}</button>
            ))}
          </div>
        )}
      </div>

      <Link href="/shop" className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur px-4 py-3 text-[10px] uppercase tracking-widest hover:bg-white shadow-sm sm:bottom-auto sm:top-3 sm:right-3">Grid view</Link>

      {loading && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 bg-white/90 px-4 py-2 text-[11px] tracking-wide shadow-sm">Preparing the collection… {Math.round((progress.done / progress.total) * 100)}%</div>}

      {hint && !loading && !selected && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/75 text-white px-5 py-3 text-xs text-center max-w-[90vw]" onClick={() => setHint(false)}>
          Drag to look · W A S D to walk · tap a department above to jump · tap any piece to pick it up and turn it in your hands
        </div>
      )}

      {/* Touch navigation: mobile users should not need a physical keyboard or mouse wheel. */}
      {!selected && (
        <div className="absolute bottom-4 left-4 z-10 grid grid-cols-3 gap-1.5 sm:hidden" aria-label="Showroom movement controls">
          <span />
          <button type="button" aria-label="Move forward" onClick={() => engine.current?.move("forward")} className="h-11 w-11 flex items-center justify-center bg-white/90 text-stone-900 shadow"><ArrowUp size={18} /></button>
          <span />
          <button type="button" aria-label="Move left" onClick={() => engine.current?.move("left")} className="h-11 w-11 flex items-center justify-center bg-white/90 text-stone-900 shadow"><ArrowLeft size={18} /></button>
          <button type="button" aria-label="Move backward" onClick={() => engine.current?.move("back")} className="h-11 w-11 flex items-center justify-center bg-white/90 text-stone-900 shadow"><ArrowDown size={18} /></button>
          <button type="button" aria-label="Move right" onClick={() => engine.current?.move("right")} className="h-11 w-11 flex items-center justify-center bg-white/90 text-stone-900 shadow"><ArrowRight size={18} /></button>
        </div>
      )}

      {/* Floating product label: live catalogue name + price */}
      {hover && !selected && (
        <div className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-full bg-white px-3 py-2 shadow-lg text-center" style={{ left: hover.x, top: hover.y - 14 }}>
          <p className="text-[11px] uppercase tracking-wider">{hover.p.name.charAt(0).toUpperCase() + hover.p.name.slice(1).toLowerCase()}</p>
          <p className="text-sm font-medium">{formatPrice(parseFloat(hover.p.price) || 0)}</p>
        </div>
      )}

      {/* picked-up product: controls + quick view */}
      {selected && (
        <aside className="absolute z-20 bg-white/95 backdrop-blur shadow-xl bottom-0 inset-x-0 max-h-[46vh] overflow-y-auto sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-auto sm:h-full sm:max-h-none sm:w-[330px]">
          <button onClick={close} aria-label="Close" className="absolute top-3 right-3 p-1.5 hover:bg-stone-100"><X size={16} /></button>
          <div className="p-5 sm:p-6 sm:pt-16">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{selected.category_name}</p>
            <h2 className="font-editorial text-2xl mt-1 pr-6">{selected.name.charAt(0).toUpperCase() + selected.name.slice(1).toLowerCase()}</h2>
            <p className="mt-1 text-lg">{formatPrice(parseFloat(selected.price) || 0)}</p>

            <p className="mt-5 mb-2 text-[10px] uppercase tracking-widest text-stone-500 flex items-center gap-1.5"><RotateCw size={12} /> Turn it · drag the product in any direction</p>
            {!hasTrue360 && <p className="mb-3 text-[10px] leading-relaxed text-stone-400">Photo-based preview. A true 360° view appears when this product has a 3D model or turntable images.</p>}
            <div className="flex flex-wrap gap-1.5">
              {views.map((v, i) => <button key={i} onClick={() => { setView(v.k); engine.current?.setInspectView(v.k); }} className={`px-3 py-1.5 text-[10px] uppercase tracking-wider border ${view === v.k ? "bg-black text-white border-black" : "border-stone-200 hover:border-stone-500"}`}>{v.label}</button>)}
              <button onClick={() => engine.current?.zoomInspect(-0.25)} aria-label="Zoom out" className="px-2.5 border border-stone-200 hover:border-stone-500"><Minus size={13} /></button>
              <button onClick={() => engine.current?.zoomInspect(0.25)} aria-label="Zoom in" className="px-2.5 border border-stone-200 hover:border-stone-500"><Plus size={13} /></button>
            </div>

            <div className="mt-6 space-y-2">
              <button onClick={() => setQuick(selected)} className="w-full py-3.5 border border-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black hover:text-white transition"><Eye size={14} /> Quick view · size &amp; colour</button>
              {canQuickAdd && (
                <button onClick={add} disabled={adding} className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"><ShoppingBag size={14} /> {added ? "Added to bag ✓" : adding ? "Adding…" : "Add to bag"}</button>
              )}
              <TryOnButton variant="solid" product={{ id: selected.id, name: selected.name, slug: selected.slug, colors: selected.colors }} />
              <Link href={`/product/${selected.slug}`} className="block text-center text-[11px] uppercase tracking-widest underline underline-offset-4 pt-2">Full details</Link>
              {err && <p className="text-xs text-red-700">{err}</p>}
            </div>
          </div>
        </aside>
      )}

      {quick && <QuickViewModal slug={quick.slug} onClose={() => setQuick(null)} />}
    </div>
  );
}
