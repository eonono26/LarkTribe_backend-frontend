"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocalization } from "@/lib/localization-context";
import { useCart } from "@/lib/cart-context";
import { apiErrorMessage } from "@/lib/api";
import QuickViewModal from "@/components/QuickViewModal";
import ColorSwatch from "@/components/ColorSwatch";
import type { ProductListItem } from "@/lib/types";

interface CardImage {
  url: string;
  color: string;
}

const HOVER_CYCLE_MS = 1100;

/**
 * Minimal, editorial-style product card — modeled on vivetofficial.com's
 * PLP/search cards: no border, shadow or rounded panel around the whole
 * card. Just a clean product photo (cycling through the product's other
 * photos on hover), a "Quick add"/"Quick view" trigger that fades in, and
 * plain name + price set underneath with no chrome.
 *
 * Supports color swatches: clicking one swaps the displayed photo using
 * product.images (color-tagged) with product.color_images as a fallback,
 * the same convention the flat ProductCard grid uses. When the selected
 * color resolves to a real variant and needs no size, the action button
 * adds it straight to the bag; otherwise it opens Quick View.
 */
export default function EditorialProductCard({
  product,
  badge,
}: {
  product: ProductListItem;
  badge?: string;
}) {
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();
  const [isHovering, setIsHovering] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const colors = product.colors || [];
  const colorImages = product.color_images || {};
  const colorVariantIds = product.color_variant_ids || {};
  const needsSize = product.needs_size || false;

  // Default color is the first swatch, same convention as the flat grid card.
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colors[0]);

  const buildFullUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api$/, "");
    return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  const allImages = useMemo<CardImage[]>(() => {
    const list: CardImage[] = [];
    if (product.images?.length) {
      for (const img of product.images) {
        const url = buildFullUrl(img.image);
        if (url) list.push({ url, color: img.color || "" });
      }
    }
    const fallback = buildFullUrl(product.image_url || product.image);
    if (fallback) list.push({ url: fallback, color: "" });

    const seen = new Set<string>();
    const deduped: CardImage[] = [];
    for (const item of list) {
      if (item.url && !seen.has(item.url)) {
        seen.add(item.url);
        deduped.push(item);
      }
    }
    return deduped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.images, product.image_url, product.image]);

  const galleryImages = useMemo<CardImage[]>(() => {
    if (!selectedColor) return allImages;
    const tagged = allImages.filter((i) => i.color.toLowerCase() === selectedColor.toLowerCase());
    if (tagged.length > 0) {
      return [...tagged, ...allImages.filter((i) => !i.color)];
    }
    const mapped = buildFullUrl(colorImages[selectedColor]);
    if (mapped) return [{ url: mapped, color: selectedColor }, ...allImages.filter((i) => i.url !== mapped)];
    return allImages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allImages, selectedColor, colorImages]);

  useEffect(() => {
    setHoverIndex(0);
  }, [selectedColor]);

  useEffect(() => {
    if (!isHovering || galleryImages.length <= 1) {
      setHoverIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setHoverIndex((i) => (i + 1) % galleryImages.length);
    }, HOVER_CYCLE_MS);
    return () => clearInterval(interval);
  }, [isHovering, galleryImages.length]);

  const activeImage = galleryImages[hoverIndex] || galleryImages[0];

  const numericPrice = Number(product.price) || 0;
  const comparePrice = product.compare_at_price != null ? Number(product.compare_at_price) || 0 : null;

  const resolvedVariantId = useMemo(() => {
    if (colors.length === 0) return null;
    if (!selectedColor) return null;
    return colorVariantIds?.[selectedColor] ?? null;
  }, [colors.length, selectedColor, colorVariantIds]);

  const isInStock = (product.stock ?? 0) > 0;
  const canQuickAdd = isInStock && !needsSize && (colors.length === 0 || resolvedVariantId != null);

  function handleColorSelect(e: React.MouseEvent, color: string) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColor(color);
    setAddError(null);
  }

  async function handlePrimaryAction(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canQuickAdd) {
      setShowQuickView(true);
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await addItem(product.id, 1, resolvedVariantId);
    } catch (err) {
      setAddError(apiErrorMessage(err, "Couldn't add this to your bag."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="group font-sans"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Link href={selectedColor ? `/product/${product.slug}?color=${encodeURIComponent(selectedColor)}` : `/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] bg-stone-50 overflow-hidden">
          {activeImage ? (
            <Image
              key={activeImage.url}
              src={activeImage.url}
              alt={product.name}
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No image</div>
          )}

          {isHovering && galleryImages.length > 1 && (
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1">
              {galleryImages.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-1 rounded-full transition-colors ${i === hoverIndex ? "bg-espresso" : "bg-white/80"}`}
                />
              ))}
            </div>
          )}

          {badge && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase font-semibold text-white bg-[var(--color-accent)] shadow-sm">
              {badge}
            </span>
          )}

          {/* Quick add / Quick view — fades in on hover, like the reference */}
          {isInStock && (
            <div
              className={`absolute inset-x-0 bottom-0 flex justify-center transition-opacity duration-200 ${
                isHovering ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={adding}
                className="w-full bg-white/90 py-2 text-[11px] uppercase tracking-widest text-espresso hover:bg-white transition-colors disabled:opacity-60"
              >
                {adding ? "Adding…" : canQuickAdd ? "Quick add" : "Quick view"}
              </button>
            </div>
          )}
        </div>

        <div className="pt-3 flex flex-col gap-0.5">
          <h3 className="text-xs uppercase tracking-wide text-espresso line-clamp-1">{product.name}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-espresso">{formatPrice(numericPrice)}</span>
            {comparePrice !== null && comparePrice > numericPrice && (
              <span className="text-xs text-stone-400 line-through">{formatPrice(comparePrice)}</span>
            )}
          </div>
        </div>
      </Link>

      {colors.length > 0 && (
        <div className="flex items-center gap-1.5 pt-2">
          {colors.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              size={16}
              shape="round"
              selected={selectedColor === color}
              onClick={(e) => handleColorSelect(e, color)}
            />
          ))}
        </div>
      )}

      {addError && (
        <p role="alert" className="text-[10px] text-red-600 pt-1">
          {addError}
        </p>
      )}

      {showQuickView && (
        <QuickViewModal slug={product.slug} initialColor={selectedColor} onClose={() => setShowQuickView(false)} />
      )}
    </div>
  );
}
