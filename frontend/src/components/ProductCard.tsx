"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ImageOff } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import { api, apiErrorMessage } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Wishlist } from "@/lib/types";
import QuickViewModal from "@/components/QuickViewModal";
import ColorSwatch from "@/components/ColorSwatch";
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
  const [wishlistItemId, setWishlistItemId] = useState<number | null>(null);
  const [wishlistBusy, setWishlistBusy] = useState(false);
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
  } = product;

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
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api$/, "");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn()) {
      setIsWishlisted(false);
      setWishlistItemId(null);
      return;
    }

    api.wishlist().then((response) => {
      const items = (Array.isArray(response) ? response : response.results) as Wishlist[];
      const match = items.find((item) => String(item.product.id) === String(id));
      if (!cancelled) {
        setWishlistItemId(match?.id ?? null);
        setIsWishlisted(Boolean(match));
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [id]);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistBusy) return;

    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }

    setWishlistBusy(true);
    try {
      if (wishlistItemId !== null) {
        await api.removeFromWishlist(wishlistItemId);
        setWishlistItemId(null);
        setIsWishlisted(false);
      } else {
        const created = await api.addToWishlist(id);
        setWishlistItemId(created.id);
        setIsWishlisted(true);
        api.track("wishlist_add", { product: id });
      }
      window.dispatchEvent(new Event("larktribe:wishlist-updated"));
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
    } catch (err) {
      setAddError(apiErrorMessage(err, "Couldn't add this to your bag."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className={`group relative bg-white border border-stone-200 ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setHoverIndex(0);
      }}
    >
      <Link href={selectedColor ? `/product/${slug}?color=${encodeURIComponent(selectedColor)}` : `/product/${slug}`} className="block">
        {/* Image */}
        <div className="relative w-full aspect-square bg-stone-50 overflow-hidden">
          {!hasCurrentImageError ? (
            <Image
              key={currentImageKey}
              src={finalImage}
              alt={name}
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={handleImageError}
              unoptimized={finalImage.startsWith("data:")}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
              <ImageOff size={28} className="mb-1 opacity-50" />
              <span className="text-xs">No image</span>
            </div>
          )}

          {/* Dots — only when hovering has more than one photo to cycle through */}
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

          {!isInStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-espresso text-xs uppercase tracking-widest">Sold out</span>
            </div>
          )}

          {discount > 0 && isInStock && (
            <span className="absolute top-2.5 left-2.5 text-[10px] uppercase tracking-wider text-espresso">
              -{discount}%
            </span>
          )}

          <button
            onClick={handleWishlist}
            className={`absolute top-2.5 right-2.5 text-espresso transition-opacity ${
              isHovering || isMobile ? "opacity-100" : "opacity-0"
            }`}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            disabled={wishlistBusy}
          >
            <Heart size={16} className={isWishlisted ? "fill-espresso" : ""} />
          </button>

          {/* Primary action — center overlay on hover: "Quick add" straight to
              the bag when the selected color/size resolves to a real variant,
              else "Quick view" so the shopper can finish picking options. */}
          {isInStock && (
            <div
              className={`absolute inset-x-0 bottom-0 flex items-center justify-center pb-0 bg-white/0 transition-opacity duration-200 ${
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
        {/* Color swatches — clicking swaps the photo above and re-resolves the variant for Quick Add */}
        {colors.length > 0 && (
          <div className="flex items-center gap-x-2 gap-1.5 pt-2 pb-1 pl-8">
            {colors.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                size={20}
                shape="round"
                selected={selectedColor === color}
                onClick={(e) => handleColorSelect(e, color)}
              />
            ))}
          </div>
        )}


        {/* Price + name, plain text, no card padding chrome */}
        <div className="pt-3 flex flex-col gap-0.5 pl-8">
          <div className="flex items-baseline gap-2">
            <span className="text-md text-espresso">{formatPrice(numericPrice)}</span>
            {numericComparePrice !== null && numericComparePrice > numericPrice && (
              <span className="text-md text-stone-400 line-through">{formatPrice(numericComparePrice)}</span>
            )}
          </div>
          <h3 className="text-md uppercase tracking-wide text-espresso line-clamp-1 mb-2">{name}</h3>
        </div>
      </Link>

      
      {addError && (
        <p role="alert" className="text-[10px] text-red-600 pt-1 pb-2">
          {addError}
        </p>
      )}

      {showQuickView && (
        <QuickViewModal slug={slug} initialColor={selectedColor} onClose={() => setShowQuickView(false)} />
      )}
    </div>
  );
}
