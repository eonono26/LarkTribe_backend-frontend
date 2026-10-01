"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { api, apiErrorMessage, mediaUrl } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import ColorSwatch from "@/components/ColorSwatch";
import { colorsOf, colorStock, findVariant, imagesForColor, initialColor, pickSize, sizesForColor } from "@/lib/variants";
import type { ProductDetail } from "@/lib/types";

interface QuickViewModalProps {
  slug: string;
  onClose: () => void;
  initialColor?: string | null;
}

export default function QuickViewModal({ slug, onClose, initialColor: initialColor_ }: QuickViewModalProps) {
  const { addItem } = useCart();
  const { formatPrice } = useLocalization();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the full product detail — the list card only has summary data,
  // so quick view needs its own fetch for sizes/colors/description.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMissing(false);

    api
      .product(slug)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        const pv = p.variants || [];
        const startColor = initialColor(pv, initialColor_);
        setSelectedColor(startColor);
        setSelectedSize(pickSize(pv, startColor, null));
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Lock page scroll while the modal is open, and let Escape close it.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const variants = useMemo(() => product?.variants || [], [product]);
  const colors = useMemo(() => colorsOf(variants), [variants]);

  // Sizes for the SELECTED color only, with per-size stock — a sold-out size
  // is crossed out rather than hidden.
  const sizeOptions = useMemo(() => sizesForColor(variants, selectedColor), [variants, selectedColor]);
  const matchedVariant = findVariant(variants, selectedColor, selectedSize);
  const stockLeft = matchedVariant ? matchedVariant.stock : product?.stock ?? 0;

  // Photos follow the selected color.
  const images = useMemo(() => imagesForColor(product?.images || [], selectedColor), [product, selectedColor]);
  const activeImage = images[selectedImageIndex] || images[0];

  function selectColor(color: string) {
    setSelectedColor(color);
    setSelectedSize((cur) => pickSize(variants, color, cur));
    setSelectedImageIndex(0);
    setError(null);
  }

  async function handleAddToCart() {
    if (!product || adding) return;
    setAdding(true);
    setError(null);
    try {
      await addItem(product.id, 1, matchedVariant?.id ?? null);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, "Couldn't add this to your bag. Please try again."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-stone-950/50 p-0 sm:p-6 font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-espresso hover:opacity-60 transition-opacity"
        >
          Close
          <X size={14} />
        </button>

        {loading && (
          <div className="p-16 text-center text-stone-400 text-sm">Loading…</div>
        )}

        {!loading && missing && (
          <div className="p-16 text-center text-stone-400 text-sm">
            Sorry, we couldn't load this product.
          </div>
        )}

        {!loading && product && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 sm:p-10">
            {/* Images */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full aspect-[4/5] bg-stone-50 overflow-hidden">
                {activeImage ? (
                  <Image
                    key={activeImage.id}
                    src={mediaUrl(activeImage.image)}
                    alt={activeImage.alt_text || product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 480px"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                    No image
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImageIndex(i)}
                      className={`relative shrink-0 w-16 h-16 bg-stone-50 overflow-hidden border transition ${
                        i === selectedImageIndex ? "border-espresso" : "border-transparent hover:border-stone-300"
                      }`}
                      aria-label={`Show image ${i + 1}`}
                    >
                      <Image src={mediaUrl(img.image)} alt={img.alt_text || product.name} fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-5 pr-8 sm:pr-0">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-base sm:text-lg uppercase tracking-normal text-espresso">{product.name}</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-espresso">{formatPrice(parseFloat(product.price) || 0)}</span>
                  {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
                    <span className="text-xs text-stone-400 line-through">
                      {formatPrice(parseFloat(product.compare_at_price))}
                    </span>
                  )}
                </div>
              </div>

              {colors.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-stone-500">
                    Color <span className="text-espresso">{selectedColor}</span>
                  </span>
                  <div className="flex items-center gap-3 flex-wrap" role="group" aria-label="Color">
                    {colors.map((c) => (
                      <ColorSwatch
                        key={c}
                        color={c}
                        size={28}
                        selected={selectedColor === c}
                        soldOut={colorStock(variants, c) <= 0}
                        onClick={() => selectColor(c)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sizeOptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-stone-500">Size</span>
                  <div className="grid grid-cols-7 gap-2 max-w-sm">
                    {sizeOptions.map(({ size, inStock }) => (
                      <button
                        key={size}
                        disabled={!inStock}
                        onClick={() => inStock && setSelectedSize(size)}
                        aria-label={inStock ? size : `${size}, out of stock`}
                        className={`relative py-2.5 text-center text-xs border transition ${
                          !inStock
                            ? "text-stone-300 border-stone-200 cursor-not-allowed"
                            : selectedSize === size
                            ? "bg-espresso text-white border-espresso"
                            : "border-stone-300 text-espresso hover:border-espresso"
                        }`}
                      >
                        {size}
                        {!inStock && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="w-full h-px bg-stone-300 rotate-[-20deg]" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={stockLeft <= 0 || adding || (variants.length > 0 && !matchedVariant)}
                className="w-full py-4 bg-espresso text-stone-50 hover:bg-stone-950 disabled:opacity-40 text-xs uppercase tracking-widest font-semibold transition-colors"
              >
                {variants.length > 0 && !matchedVariant
                  ? "Select options"
                  : stockLeft > 0
                  ? adding
                    ? "Adding…"
                    : "Add to cart"
                  : "Out of stock"}
              </button>
              {error && (
                <p role="alert" className="text-xs text-red-600 -mt-2">
                  {error}
                </p>
              )}

              {product.materials && (
                <p className="text-xs text-stone-500">
                  <span className="text-stone-400">Materials: </span>
                  {product.materials}
                </p>
              )}

              {product.description && (
                <div className="pt-2 border-t border-stone-200">
                  <h3 className="text-sm text-espresso pt-4 pb-2">Description</h3>
                  <p className="text-xs text-stone-500 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              <Link
                href={`/product/${product.slug}`}
                className="text-[11px] uppercase tracking-widest text-stone-500 hover:text-espresso underline underline-offset-4 mt-1"
              >
                View full details
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
