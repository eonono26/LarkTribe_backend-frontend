"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { loadStore, productImage, type StoreWing } from "@/components/showroom/data";
import QuickViewModal from "@/components/QuickViewModal";
import TryOnButton from "@/components/TryOnButton";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import { apiErrorMessage } from "@/lib/api";
import { trackEvent } from "@/lib/tracking";
import type { ProductListItem } from "@/lib/types";

const BOTTOM = /pant|trouser|short|jean|skirt|legging|jogger/i;
const FULL = /dress|romper|bodysuit|jumpsuit|onesie|sleepsuit|gown/i;
const rankOf = (p: ProductListItem) => (FULL.test(p.category_name + " " + p.name) ? 0 : BOTTOM.test(p.category_name + " " + p.name) ? 2 : 1);

/** Outfits are assembled from live catalogue data: each look takes one piece from three different categories. */
function buildLooks(wing: StoreWing | undefined): ProductListItem[][] {
  if (!wing) return [];
  const bays = wing.bays.filter((b) => b.products.length);
  if (bays.length === 0) return [];
  const looks: ProductListItem[][] = [];
  for (let k = 0; k < 6; k++) {
    const pieces: ProductListItem[] = [];
    const take = Math.min(3, bays.length);
    for (let j = 0; j < take; j++) {
      const bay = bays[(k + j) % bays.length];
      const piece = bay.products[(k + j * 2) % bay.products.length];
      if (piece && !pieces.some((x) => x.id === piece.id)) pieces.push(piece);
    }
    looks.push(pieces.sort((a, b) => rankOf(a) - rankOf(b)));
  }
  return looks;
}

export default function TheLookPage() {
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();
  const [wings, setWings] = useState<StoreWing[] | null>(null);
  const [error, setError] = useState(false);
  const [wi, setWi] = useState(0);
  const [sel, setSel] = useState(0);
  const [quick, setQuick] = useState<ProductListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => { loadStore().then((w) => { setWings(w); }).catch(() => setError(true)); }, []);
  const wing = wings?.[wi];
  const looks = useMemo(() => buildLooks(wing), [wing]);
  const look = looks[sel] || [];
  const total = look.reduce((n, p) => n + (parseFloat(p.price) || 0), 0);

  async function addOutfit() {
    setBusy(true); setNote("");
    const needSize: string[] = []; let added = 0;
    for (const p of look) {
      const variant = p.colors?.length ? p.color_variant_ids?.[p.colors[0]] ?? null : null;
      const direct = !p.needs_size && (!p.colors?.length || variant != null);
      if (!direct) { needSize.push(p.name); continue; }
      try { await addItem(Number(p.id), 1, variant); added++; trackEvent("AddToCart", { id: p.id, name: p.name, value: parseFloat(p.price) || 0 }); } catch (e) { setNote(apiErrorMessage(e, "Couldn't add everything.")); }
    }
    setNote(needSize.length ? `${added} added. Pick a size for: ${needSize.join(", ")}.` : added ? `All ${added} pieces are in your bag ✓` : "");
    setBusy(false);
  }

  if (error) return <p className="py-32 text-center text-sm text-stone-500">We couldn&apos;t load the looks right now.</p>;
  if (!wings) return <p className="py-32 text-center text-sm text-stone-400">Styling the looks…</p>;

  return (
    <main className="relative min-h-[calc(100vh-var(--header-h,72px))] bg-white overflow-hidden">
      <div className="container-shell pt-8 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[13px] tracking-[0.08em] font-editorial ">Try the Look.</h1>
          <p className="text-sm text-stone-500 mt-2">Pick a look, see the whole outfit, and bag it in one tap.</p>
        </div>
        <div className="flex gap-1 bg-white p-1 shadow-sm">
          {wings.map((w, i) => (
            <button key={w.slug} onClick={() => { setWi(i); setSel(0); setNote(""); }} className={`px-4 py-2 text-[10px] uppercase tracking-widest transition ${wi === i ? "bg-black text-white" : "hover:bg-stone-100"}`}>{w.title}</button>
          ))}
        </div>
      </div>

      <div className="container-shell grid lg:grid-cols-[1fr_340px] gap-8 pb-10">
        {/* the stage: borderless looks standing on a seamless floor */}
        <div className="relative [perspective:1400px]">
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-stone-200/60 to-transparent pointer-events-none" />
          <div className="relative flex items-end justify-center gap-2 sm:gap-5 min-h-[480px] lg:min-h-[560px] pt-6">
            {looks.map((pieces, i) => {
              const active = i === sel;
              return (
                <button
                  key={i}
                  onClick={() => { setSel(i); setNote(""); }}
                  aria-label={`Look ${i + 1}`}
                  className="group relative flex flex-col items-center transition-all duration-500 ease-out will-change-transform focus:outline-none"
                  style={{
                    width: active ? "min(28%, 210px)" : "min(13%, 100px)",
                    opacity: active ? 1 : 0.55,
                    filter: active ? "none" : "saturate(.75)",
                    transform: active ? "translateZ(60px) rotateY(0deg)" : `translateZ(0) rotateY(${(i - sel) * -9}deg)`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="w-full flex flex-col items-center">
                    {pieces.map((p, k) => (
                      <div key={p.id} className="relative w-full aspect-square" style={{ marginTop: k ? "-18%" : 0, zIndex: 10 - k, filter: "brightness(1.04) contrast(1.06)" }}>
                        <Image src={productImage(p)} alt={p.name} fill sizes="280px" className="object-contain" />
                      </div>
                    ))}
                  </div>
                  <div className={`mt-1 h-3 rounded-[50%] bg-black/30 blur-md transition-all duration-500 ${active ? "w-4/5" : "w-3/5 opacity-60"}`} />
                  <span className={`mt-2 text-[10px] uppercase tracking-widest transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>Look {String(i + 1).padStart(2, "0")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* the pieces of the chosen look */}
        <aside className="lg:pt-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-4">In this look</p>
          <ul className="space-y-4">
            {look.map((p) => (
              <li key={p.id} className="flex gap-4 items-center">
                <Link href={`/product/${p.slug}`} className="relative w-16 aspect-[4/5] bg-white shrink-0">
                  <Image src={productImage(p)} alt={p.name} fill sizes="64px" className="object-contain" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${p.slug}`} className="block text-sm truncate hover:underline">{p.name}</Link>
                  <p className="text-xs text-stone-500">{p.category_name}</p>
                  <p className="text-sm mt-0.5">{formatPrice(parseFloat(p.price) || 0)}</p>
                </div>
                <button onClick={() => setQuick(p)} className="text-[10px] uppercase tracking-widest underline underline-offset-4 shrink-0">Quick view</button>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-5 border-t border-stone-300">
            <div className="flex justify-between text-sm mb-4"><span>Total</span><span className="font-medium">{formatPrice(total)}</span></div>
            <button onClick={addOutfit} disabled={busy || look.length === 0} className="w-full py-4 bg-black text-white text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-800 transition disabled:opacity-50">
              <ShoppingBag size={14} /> {busy ? "Adding…" : "Add outfit to bag"}
            </button>
            {look[0] && (
              <div className="mt-2">
                <TryOnButton variant="solid" label="See this look on me" product={{ id: look[0].id, name: look[0].name, slug: look[0].slug, colors: look[0].colors }} companions={look.slice(1)} />
              </div>
            )}
            {note && <p className="mt-3 text-xs text-stone-600">{note}</p>}
          </div>
        </aside>
      </div>

      {quick && <QuickViewModal slug={quick.slug} onClose={() => setQuick(null)} />}
    </main>
  );
}
