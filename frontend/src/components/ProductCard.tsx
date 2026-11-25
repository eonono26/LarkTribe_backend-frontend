"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, ImageOff, ShoppingBag } from "lucide-react";
import TryOnButton from "@/components/TryOnButton";
import { trackEvent } from "@/lib/tracking";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import { api, apiErrorMessage } from "@/lib/api";
import QuickViewModal from "@/components/QuickViewModal";
import ColorSwatch from "@/components/ColorSwatch";
import { API_BASE_URL } from "@/lib/config";
import { isLoggedIn } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist-context";
import type { ProductListItem } from "@/lib/types";

interface ProductCardProps {
  product: ProductListItem;
  className?: string;
}

interface CardImage {
  url: string;
  color: string;
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f8f0f0'/%3E%3Ctext x='200' y='200' font-family='Arial' font-size='16' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const { isSaved, toggle: toggleWishlistItem } = useWishlist();
  const isWishlisted = isSaved(product.id);
  const [showQuickView, setShowQuickView] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();
  const {
    id,
    name,
    slug,
    price,
    compare_at_price,
    image_url,
    image,
    images: productImages = [],
    discount_percent = 0,
    stock = 0,
    colors = [],
    color_images = {},
    color_variant_ids = {},
    needs_size = false,
  } = product;
  const displayName = name.trim();

  const numericPrice = Number(price) || 0;
  const numericComparePrice = compare_at_price != null ? Number(compare_at_price) || 0 : null;
  const isInStock = stock > 0;
  const discount = numericComparePrice && numericPrice < numericComparePrice
    ? Math.round(((numericComparePrice - numericPrice) / numericComparePrice) * 100)
    : discount_percent || 0;

  const extractImageUrl = (img: unknown): string | null => {
    if (!img) return null;
    if (typeof img === "string") return img.trim() || null;
    if (typeof img === "object") {
      const o = img as Record<string, unknown>;
      if (o.image) return extractImageUrl(o.image);
      if (typeof o.file_url === "string") return o.file_url;
      if (typeof o.file === "string") return o.file;
      if (typeof o.url === "string") return o.url;
    }
    return null;
  };

  const buildFullUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
    const baseUrl = API_BASE_URL;
    return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  // Every photo this product has, each tagged with the color it shows (""
  // for a general/untagged shot) — the single source used both for the
  // default image and for the "hover to see the rest" slideshow.
  const allImages = useMemo<CardImage[]>(() => {
    const list: CardImage[] = [];

    if (productImages?.length) {
      for (const img of productImages as unknown[]) {
        const url = buildFullUrl(extractImageUrl(img));
        if (url) {
          const o = img && typeof img === "object" ? (img as Record<string, unknown>) : null;
          const color = o && typeof o.color === "string" ? o.color : "";
          list.push({ url, color });
        }
      }
    }
    if (image_url) {
      const url = buildFullUrl(extractImageUrl(image_url));
      if (url) list.push({ url, color: "" });
    }
    if (image) {
      const url = buildFullUrl(extractImageUrl(image));
      if (url) list.push({ url, color: "" });
    }

    const seen = new Set<string>();
    const deduped: CardImage[] = [];
    for (const item of list) {
      if (item.url && !seen.has(item.url)) {
        seen.add(item.url);
        deduped.push(item);
      }
    }
    return deduped.length > 0 ? deduped : [{ url: PLACEHOLDER_IMAGE, color: "" }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productImages, image_url, image]);

  // Default color is the first swatch, like the reference (first swatch ring-selected on load).
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colors[0]);


  // Photos for the color currently selected: that color's own shots first,
  // then general shots — same convention as the product page gallery. Falls
  // back to the API's color->image map, then to every photo, when a color
  // has no dedicated photo tagged yet.
  const galleryImages = useMemo<CardImage[]>(() => {
    if (!selectedColor) return allImages;

    const tagged = allImages.filter((i) => i.color.toLowerCase() === selectedColor.toLowerCase());
    if (tagged.length > 0) {
      const general = allImages.filter((i) => !i.color);
      return [...tagged, ...general];
    }

    const mapped = color_images?.[selectedColor] ? buildFullUrl(color_images[selectedColor]) : null;
    if (mapped) {
      return [{ url: mapped, color: selectedColor }, ...allImages.filter((i) => i.url !== mapped)];
    }

    return allImages;
  }, [allImages, selectedColor, color_images]);

  // Keep the product image stable; hover is reserved for the action controls.
  const activeImage = galleryImages[0];
  const currentImageKey = `${selectedColor || "default"}-0`;
  const hasCurrentImageError = imageErrors[currentImageKey] || false;
  const finalImage = hasCurrentImageError ? PLACEHOLDER_IMAGE : activeImage?.url || PLACEHOLDER_IMAGE;

  // Whether the currently selected color can be added straight to the bag
  // (a resolvable variant, and no size to pick), vs. needing Quick View.
  const resolvedVariantId = useMemo(() => {
    if (colors.length === 0) return null;
    if (!selectedColor) return null;
    return color_variant_ids?.[selectedColor] ?? null;
  }, [colors.length, selectedColor, color_variant_ids]);

  const canQuickAdd = isInStock && !needs_size && (colors.length === 0 || resolvedVariantId != null);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistBusy) return;
    if (!isLoggedIn()) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setWishlistBusy(true);
    setAddError(null);
    try {
      await toggleWishlistItem(id);
    } catch (error) {
      setAddError(apiErrorMessage(error, "Couldn't update your wishlist."));
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleColorSelect = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColor(color);
    setAddError(null);
  };

  const handleImageError = () => {
    setImageErrors((prev) => ({ ...prev, [currentImageKey]: true }));
  };

  // Center overlay button: adds the selected color straight to the bag when
  // possible (no size to choose), otherwise opens Quick View so the shopper
  // can pick a size — mirrors the backend's needs_size/color_variant_ids hint.
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
      await addItem(id, 1, resolvedVariantId);
      trackEvent("AddToCart", { id, name, value: numericPrice });
    } catch (err) {
      setAddError(apiErrorMessage(err, "Couldn't add this to your bag."));
    } finally {
      setAdding(false);
    }
  }

  const glass = "pointer-events-auto flex items-center justify-center h-9 bg-white text-black hover:bg-black hover:text-white transition-colors";
  const hoverImage = galleryImages[1]?.url && galleryImages[1].url !== activeImage?.url ? galleryImages[1].url : null;
  const openQuick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); };

  return (
    <div
      className={`lark-product-card group relative ${className}`}
    >
      <div className="block">
        {/* Static product image; only the action buttons respond to hover. */}
        <div className="relative w-full aspect-[3/4]">
          <div
            className="absolute inset-0 overflow-hidden bg-stone-100"
          >
            {!hasCurrentImageError ? (
              <Image
                key={currentImageKey}
                src={finalImage}
                alt={name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
                onError={handleImageError}
                unoptimized={finalImage.startsWith("data:")}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                <ImageOff size={28} className="mb-1 opacity-50" />
                <span className="text-xs">No image</span>
              </div>
            )}
            {hoverImage && !hasCurrentImageError && (
              <Image
                src={hoverImage}
                alt=""
                fill
                aria-hidden
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
              />
            )}
            <Link
              href={selectedColor ? `/product/${slug}?color=${encodeURIComponent(selectedColor)}` : `/product/${slug}`}
              aria-label={`View ${name}`}
              onClick={() => api.track("click", { product: id })}
              className="absolute inset-0 z-0"
            />

            {!isInStock && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <span className="text-black text-[11px] uppercase tracking-[0.08em]">Sold out</span>
              </div>
            )}

            {discount > 0 && isInStock && (
              <span className="absolute top-2 left-2 text-[10px] uppercase tracking-[0.06em] bg-white text-black px-1.5 py-0.5">
                -{discount}%
              </span>
            )}

            <button
              onClick={handleWishlist}
              className="lark-card-wishlist absolute top-2 right-2 z-10 h-8 w-8 flex items-center justify-center text-black transition-opacity"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={isWishlisted}
              disabled={wishlistBusy}
            >
              <Heart size={17} strokeWidth={1.3} className={isWishlisted ? "fill-black" : ""} />
            </button>

            {/* Actions float above the image (z-lifted): Quick view · Try on · Add */}
            {isInStock && (
              <div
                className="lark-card-actions absolute inset-x-2 bottom-2 z-10 flex items-center gap-1.5 transition-all duration-200"
                
              >
                <button type="button" onClick={openQuick} className={`${glass} flex-1 gap-1.5 whitespace-nowrap text-[10px] uppercase tracking-[0.06em] px-2`} aria-label="Quick view">
                  <Eye size={13} /> <span className="hidden sm:inline">Quick view</span>
                </button>
                <TryOnButton product={{ id, name, slug, colors }} color={selectedColor} label="" variant="outline" className={`${glass} !border-0 !py-0 w-9 !rounded-none`} />
                <button type="button" onClick={handlePrimaryAction} disabled={adding} className={`${glass} w-9 !bg-black !text-white hover:!bg-stone-700 disabled:opacity-60`} aria-label={canQuickAdd ? "Add to bag" : "Choose size"}>
                  <ShoppingBag size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-2 pt-2.5 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[11px] uppercase tracking-[0.04em] leading-snug text-black line-clamp-2">{displayName}</h3>
            <div className="shrink-0 text-right text-[11px] tracking-[0.02em]">
              <span className="text-black">{formatPrice(numericPrice)}</span>
              {numericComparePrice !== null && numericComparePrice > numericPrice && (
                <span className="ml-2 text-stone-400 line-through">{formatPrice(numericComparePrice)}</span>
              )}
            </div>
          </div>
          {colors.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {colors.map((color) => (
                <ColorSwatch key={color} color={color} size={12} shape="round" selected={selectedColor === color} onClick={(e) => handleColorSelect(e, color)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {addError && (
        <p role="alert" className="text-[10px] text-red-600 pt-1 pb-2">{addError}</p>
      )}

      {showQuickView && (
        <QuickViewModal slug={slug} initialColor={selectedColor} onClose={() => setShowQuickView(false)} />
      )}
    </div>
  );
}
