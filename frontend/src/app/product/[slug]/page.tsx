"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import PriceTag from "@/components/PriceTag";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";
import ReviewForm from "@/components/ReviewForm";
import RecommendedRow from "@/components/RecommendedRow";
import ProductImageGallery from "@/components/ProductImageGallery";
import SizeGuideModal from "@/components/SizeGuideModal";
import ColorSwatch from "@/components/ColorSwatch";
import { colorsOf, colorStock, findVariant, imagesForColor, initialColor, pickSize, sizesForColor } from "@/lib/variants";
import { notFound } from "next/navigation";
import type { ProductDetail, ProductListItem } from "@/lib/types";

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-stone-200" open={defaultOpen}>
      <summary className="flex items-center justify-between cursor-pointer list-none py-4">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-stone-400 text-lg leading-none w-4 text-center">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="pb-4 text-sm text-stone-500 leading-relaxed space-y-2">{children}</div>
    </details>
  );
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [similar, setSimilar] = useState<ProductListItem[]>([]);
  const [fbt, setFbt] = useState<ProductListItem[]>([]);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const p = await api.product(slug);
        if (cancelled) return;
        setProduct(p);
        const pv = p.variants || [];
        const startColor = initialColor(pv, searchParams.get("color"));
        setColor(startColor);
        setSize(pickSize(pv, startColor, null));
        const [sim, fbtData] = await Promise.all([
          api.similarProducts(p.id).catch(() => []),
          api.frequentlyBoughtTogether(p.id).catch(() => []),
        ]);
        if (!cancelled) { setSimilar(sim || []); setFbt(fbtData || []); }
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (missing) notFound();
  if (loading || !product) {
    return <main className="bg-white py-32 text-center text-stone-400 text-sm">Loading…</main>;
  }

  const variants = product.variants || [];
  const colors = colorsOf(variants);
  const reviews = product.reviews || [];
  const sizeOptions = sizesForColor(variants, color);
  const matched = findVariant(variants, color, size);
  const images = imagesForColor(product.images || [], color);
  const requiresSelection = variants.length > 0 && !matched;
  const stockLeft = matched ? matched.stock : product.stock;
  const inStock = stockLeft > 0;
  const numericPrice = parseFloat(product.price) || 0;

  function selectColor(c: string) {
    setColor(c);
    setSize(cur => pickSize(variants, c, cur));
    setQty(1);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("color", c);
      window.history.replaceState(null, "", url.toString());
    } catch { /* noop */ }
  }

  return (
    <main className="bg-white text-black pt-20 font-sans">
      <div className="container-shell pt-2 pb-16">
        {/* Breadcrumb — minimal */}
        <div className="mb-6 container-shellheader">
          <Link href="/shop" className="text-2xl tracking-widest text-stone-500 hover:text-black transition">
            Shop<span className="text-black text-2xl ml-2">+</span>
          </Link>
        </div>

        <div className="grid container-shellheader grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ================= INFO — LEFT on desktop, sticky ================= */}
          <div className="lg:col-span-5 lg:order-1 lg:sticky lg:top-24">
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl lg:text-[28px] font-medium tracking-tight leading-tight">
                  {product.name}
                </h1>
                <div className="mt-2 flex items-baseline gap-3">
                  <PriceTag price={product.price} compareAtPrice={product.compare_at_price} size="sm" />
                </div>
                {product.brand && (
                  <Link
                    href={`/brand/${product.brand.id}`}
                    className="text-xs text-stone-500 hover:text-black mt-1 inline-block"
                  >
                    {product.brand.name}
                  </Link>
                )}
              </div>

              {colors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wide text-stone-500">
                    Color <span className="text-black ml-2">{color}</span>
                  </span>
                  <div className="flex gap-2 flex-wrap" role="group" aria-label="Color">
                    {colors.map(c => (
                      <ColorSwatch
                        key={c}
                        color={c}
                        size={28}
                        selected={color === c}
                        soldOut={colorStock(variants, c) <= 0}
                        onClick={() => selectColor(c)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sizeOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-stone-500">Size</span>
                    {product.size_guide && (
                      <button
                        onClick={() => setShowSizeGuide(true)}
                        className="text-[11px] underline underline-offset-4 text-stone-500 hover:text-black"
                      >
                        Size Guide
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Size">
                    {sizeOptions.map(({ size: s, inStock: ok }) => (
                      <button
                        key={s}
                        type="button"
                        disabled={!ok}
                        onClick={() => { setSize(s); setQty(1); }}
                        className={`min-w-[52px] h-10 px-3 text-center text-xs uppercase tracking-wider transition ${
                          size === s
                            ? "bg-black text-white border border-black"
                            : ok
                            ? "border border-stone-300 text-black hover:border-black"
                            : "border border-stone-100 text-stone-300 line-through cursor-not-allowed"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center border border-stone-300 h-10">
                  <button
                    aria-label="Decrease"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-full flex items-center justify-center hover:bg-stone-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{qty}</span>
                  <button
                    aria-label="Increase"
                    onClick={() => setQty(q => Math.min(Math.max(1, stockLeft), q + 1))}
                    className="w-10 h-full flex items-center justify-center hover:bg-stone-50"
                  >
                    +
                  </button>
                </div>
                <WishlistButton productId={product.id} size={20} />
              </div>

              <AddToCartButton
                productId={product.id}
                inStock={inStock}
                variantId={matched?.id ?? null}
                quantity={qty}
                requiresSelection={requiresSelection}
                fullWidth
              />

              <p className="text-[11px] text-stone-500">
                {inStock ? (stockLeft <= 5 ? `Only ${stockLeft} left` : "In stock") : "Out of stock"}
                {color ? ` — ${[color, size].filter(Boolean).join(" / ")}` : ""}
              </p>

              <div className="pt-2">
                {product.description && (
                  <Accordion title="Description" defaultOpen>
                    <p className="whitespace-pre-line">{product.description}</p>
                  </Accordion>
                )}
                <Accordion title="Materials & Care">
                  {product.materials && <p className="font-medium text-black">{product.materials}</p>}
                  {product.care_instructions && <p className="whitespace-pre-line">{product.care_instructions}</p>}
                  <ul className="space-y-1">
                    {(product.features?.length ? product.features : ["Quality-checked before dispatch"]).map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 bg-black shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </Accordion>
                <Accordion title="Delivery & Returns">
                  <p>Nairobi delivery in 1–3 days. M-Pesa, card, and cash on delivery. Free returns within 30 days.</p>
                </Accordion>
                {product.sku && <p className="pt-4 text-[11px] text-stone-400">SKU {product.sku}</p>}
              </div>
            </div>
          </div>

          {/* ================= GALLERY — RIGHT on desktop, capped size ================= */}
         
          <div className="lg:col-span-7 lg:order-2 flex lg:justify-center">
            <div className="w-full max-w-[420px] lg:max-w-[460px]">
              <ProductImageGallery
                images={images}
                productName={product.name}
                discountPercent={product.discount_percent}
                productId={product.id}
              />
            </div>
          </div>

        </div>

        {/* Reviews */}
        <section className="mt-20 container-shellheader pt-12 border-t border-stone-200 max-w-2xl">
          <h2 className="font-editorial text-xl mb-6">Reviews</h2>
          {reviews.length > 0 ? (
            <div className="space-y-6 mb-10">
              {reviews.map(r => (
                <div key={r.id} className="text-sm border-b border-stone-100 pb-4">
                  <div className="font-medium">{r.user} — {r.rating}/5</div>
                  <p className="text-stone-500 mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400 mb-10">No reviews yet.</p>
          )}
          <ReviewForm productId={product.id} />
        </section>

        {/* {similar.length > 0 && (
          <RecommendedRow title="You May Also Like" kind="similar" productId={product.id} products={similar} />
        )}
        {fbt.length > 0 && (
          <RecommendedRow title="Complete the Look" kind="fbt" productId={product.id} products={fbt} />
        )} */}
      </div>

      {/* Sticky mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-stone-200 px-5 py-3 z-40 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase text-stone-500 truncate max-w-[140px]">{product.name}</p>
          <p className="text-lg font-medium">{new Intl.NumberFormat().format(numericPrice)}</p>
        </div>
        <AddToCartButton
          productId={product.id}
          inStock={inStock}
          variantId={matched?.id ?? null}
          quantity={qty}
          requiresSelection={requiresSelection}
          showError={false}
        />
      </div>

      {showSizeGuide && product.size_guide && (
        <SizeGuideModal guide={product.size_guide} onClose={() => setShowSizeGuide(false)} />
      )}
    </main>
  );
}