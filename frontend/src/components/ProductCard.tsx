"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, ImageOff, ShoppingBag, Sparkles, Star } from "lucide-react";
import TryOnButton from "@/components/TryOnButton";
import { trackEvent } from "@/lib/tracking";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import { api, apiErrorMessage } from "@/lib/api";
import QuickViewModal from "@/components/QuickViewModal";
import ColorSwatch from "@/components/ColorSwatch";
import { API_BASE_URL } from "@/lib/config";
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

// Cycle interval for the "hover to see the rest of the photos" slideshow.
const HOVER_CYCLE_MS = 1100;

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [hoverIndex, setHoverIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );

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
    rating_avg,
    rating_count = 0,
  } = product;
  const ratingValue = Number(rating_avg) || 0;

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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  // While hovering, if this product has more than one photo for the
  // selected color, cycle through the rest of them; revert to the first on
  // mouse-leave.
  useEffect(() => {
    if (!isHovering || galleryImages.length <= 1) return;
    const interval = setInterval(() => {
      setHoverIndex((i) => (i + 1) % galleryImages.length);
    }, HOVER_CYCLE_MS);
    return () => clearInterval(interval);
  }, [isHovering, galleryImages.length]);

  // Reset the slideshow on mouse-leave in the event handler, rather than in
  // an effect, to avoid synchronously updating state from an effect.

  // A color change starts at its first photo without synchronously updating
  // state in an effect.
  const activeImageIndex = Math.min(hoverIndex, galleryImages.length - 1);
  const activeImage = galleryImages[activeImageIndex] || galleryImages[0];
  const currentImageKey = `${selectedColor || "default"}-${activeImageIndex}`;
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

  // 3D tilt: the image stage follows the pointer (desktop only) like a card floating in space.
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const onTilt = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !stageRef.current || !tiltRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tiltRef.current.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 12}deg) translateZ(18px)`;
  };
  const resetTilt = () => { if (tiltRef.current) tiltRef.current.style.transform = ""; };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
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

  const glass = "pointer-events-auto flex items-center justify-center h-9 rounded-full bg-white/85 backdrop-blur text-espresso shadow-[0_6px_18px_-6px_rgba(0,0,0,.35)] hover:bg-white hover:scale-105 active:scale-95 transition";
  const openQuick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); };

  return (
    <div
      className={`group relative ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setHoverIndex(0);
        resetTilt();
      }}
    >
      <Link
        href={selectedColor ? `/product/${slug}?color=${encodeURIComponent(selectedColor)}` : `/product/${slug}`}
        className="block"
        onClick={() => api.track("click", { product: id })}
      >
        {/* 3D stage: floor shadow + tilting image, no border */}
        <div ref={stageRef} onPointerMove={onTilt} onPointerLeave={resetTilt} className="relative w-full aspect-[4/5] [perspective:900px]">
          <div className="absolute left-[10%] right-[10%] -bottom-1 h-4 rounded-[50%] bg-black/25 blur-md transition-all duration-300 group-hover:bg-black/40 group-hover:blur-lg group-hover:scale-95" />
          <div
            ref={tiltRef}
            className="absolute inset-0 rounded-[18px] overflow-hidden bg-gradient-to-b from-stone-50 to-stone-100 shadow-[0_14px_30px_-20px_rgba(0,0,0,.45)] group-hover:shadow-[0_34px_50px_-26px_rgba(0,0,0,.55)] transition-[transform,box-shadow] duration-200 ease-out will-change-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            {!hasCurrentImageError ? (
              <Image
                key={currentImageKey}
                src={finalImage}
                alt={name}
                fill
                className="object-cover transition-all duration-500 group-hover:scale-[1.06]"
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

            {isHovering && galleryImages.length > 1 && (
              <div className="absolute bottom-14 inset-x-0 flex items-center justify-center gap-1">
                {galleryImages.map((_, i) => (
                  <span key={i} className={`h-1 w-1 rounded-full transition-colors ${i === hoverIndex ? "bg-espresso" : "bg-white/80"}`} />
                ))}
              </div>
            )}

            {!isInStock && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <span className="text-espresso text-xs uppercase tracking-widest">Sold out</span>
              </div>
            )}

            {discount > 0 && isInStock && (
              <span className="absolute top-2.5 left-2.5 text-[10px] uppercase tracking-wider bg-white/85 backdrop-blur text-espresso px-2 py-0.5 rounded-full">
                -{discount}%
              </span>
            )}

            <button
              onClick={handleWishlist}
              className={`absolute top-2.5 right-2.5 h-8 w-8 flex items-center justify-center rounded-full bg-white/85 backdrop-blur text-espresso transition-opacity ${isHovering || isMobile ? "opacity-100" : "opacity-0"}`}
              aria-label="Add to wishlist"
            >
              <Heart size={15} className={isWishlisted ? "fill-espresso" : ""} />
            </button>

            {/* Actions float above the image (z-lifted): Quick view · Try on · Add */}
            {isInStock && (
              <div
                className={`absolute inset-x-2 bottom-2 flex items-center gap-1.5 transition-all duration-300 ${isHovering || isMobile ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                style={{ transform: "translateZ(30px)" }}
              >
                <button type="button" onClick={openQuick} className={`${glass} flex-1 gap-1.5 whitespace-nowrap text-[9px] uppercase tracking-wider px-2`} aria-label="Quick view">
                  <Eye size={13} /> <span className="hidden sm:inline">Quick view</span>
                </button>
                <TryOnButton product={{ id, name, slug, colors }} color={selectedColor} label="" variant="outline" className={`${glass} !border-0 !py-0 w-9 !rounded-full`} />
                <button type="button" onClick={handlePrimaryAction} disabled={adding} className={`${glass} w-9 !bg-espresso !text-white hover:!bg-black disabled:opacity-60`} aria-label={canQuickAdd ? "Add to bag" : "Choose size"}>
                  <ShoppingBag size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-1 pt-4 flex flex-col gap-1">
          <h3 className="text-md uppercase tracking-wide text-espresso line-clamp-2 sm:line-clamp-1">{name}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-md text-espresso">{formatPrice(numericPrice)}</span>
            {numericComparePrice !== null && numericComparePrice > numericPrice && (
              <span className="text-md text-stone-400 line-through">{formatPrice(numericComparePrice)}</span>
            )}
            {rating_count > 0 && (
              <span className="ml-auto flex items-center gap-0.5 text-[11px] text-stone-500" aria-label={`Rated ${ratingValue.toFixed(1)} out of 5`}>
                <Star size={11} className="fill-espresso text-espresso" /> {ratingValue.toFixed(1)}
              </span>
            )}
          </div>
          {colors.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {colors.map((color) => (
                <ColorSwatch key={color} color={color} size={16} shape="round" selected={selectedColor === color} onClick={(e) => handleColorSelect(e, color)} />
              ))}
            </div>
          )}
        </div>
      </Link>

      {addError && (
        <p role="alert" className="text-[10px] text-red-600 pt-1 pb-2">{addError}</p>
      )}

      {showQuickView && (
        <QuickViewModal slug={slug} initialColor={selectedColor} onClose={() => setShowQuickView(false)} />
      )}
    </div>
  );
}
