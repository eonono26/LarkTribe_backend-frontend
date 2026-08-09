"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { mediaUrl, formatKES, api } from "@/lib/api";
import type { ProductListItem, ProductDetail } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import WishlistButton from "./WishlistButton";

export default function ProductCard({ product }: { product: ProductListItem }) {
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get initial image
  const initialImage = product.image || null;
  
  // Determine if we have multiple images (from fetched data)
  const hasMultipleImages = productImages.length > 1;

  // Fetch product details on hover to get all images
  useEffect(() => {
    if (isHovering && !hasFetched && !isLoading && !productImages.length) {
      // If we have an initial image, use it immediately and fetch more
      if (initialImage) {
        setProductImages([initialImage]);
        setHasFetched(true);
      }

      // Delay fetching to avoid too many requests
      fetchTimeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          // Try to fetch product details (public endpoint, no auth needed)
          const data = await api.product(product.slug);
          if (data && data.images && data.images.length > 1) {
            const images = data.images.map(img => img.image);
            // Only update if we have more than one image
            if (images.length > 1) {
              setProductImages(images);
            }
          }
        } catch (error: any) {
          // If fetch fails, just use the single image if we have one
          console.debug('Failed to fetch additional images for:', product.slug, error?.message || '');
          if (!initialImage) {
            // Try to use the product's image_url if available
            const fallbackImage = product.image || (product as any).image_url || null;
            if (fallbackImage) {
              setProductImages([fallbackImage]);
              setHasFetched(true);
            }
          }
        } finally {
          setIsLoading(false);
        }
      }, 300);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, [isHovering, product.slug, initialImage, hasFetched, isLoading, productImages.length, product.image, (product as any).image_url]);

  // Auto-slide when hovering and have multiple images
  useEffect(() => {
    if (isHovering && hasMultipleImages) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
      }, 1500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovering, hasMultipleImages, productImages.length]);

  // Reset when not hovering
  useEffect(() => {
    if (!isHovering) {
      setCurrentImageIndex(0);
    }
  }, [isHovering]);

  // Get current image to display
  const getCurrentImage = () => {
    if (productImages.length > 0) {
      return productImages[currentImageIndex] || productImages[0] || initialImage;
    }
    return initialImage;
  };

  const currentImage = getCurrentImage();

  // Navigation handlers
  const goToPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    }
  };

  // Get images for display (either fetched images or single image)
  const displayImages = productImages.length > 0 ? productImages : (initialImage ? [initialImage] : []);

  return (
    <div 
      className="group relative border border-[var(--color-line)] rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-[3/4] bg-[var(--color-mist)] overflow-hidden">
          {currentImage ? (
            <>
              <Image
                src={mediaUrl(currentImage)}
                alt={product.name}
                fill
                className={`
                  object-cover transition-transform duration-700
                  ${isHovering ? 'scale-105' : 'scale-100'}
                `}
                sizes="(max-width: 768px) 50vw, 20vw"
                priority={currentImageIndex === 0}
              />
              
              {/* Loading indicator while fetching images */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              
              {/* Image counter dots */}
              {hasMultipleImages && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {displayImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`
                        h-1 rounded-full transition-all duration-300
                        ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}
                      `}
                    />
                  ))}
                </div>
              )}

              {/* Navigation arrows */}
              {hasMultipleImages && isHovering && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all duration-200 z-10"
                    aria-label="Previous image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all duration-200 z-10"
                    aria-label="Next image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-400 text-xs">
              No image yet
            </div>
          )}

          {/* Discount badge */}
          {product.discount_percent > 0 && (
            <span className="absolute top-2 left-2 bg-[var(--color-flag)] text-white text-[11px] font-bold px-1.5 py-0.5 rounded z-10">
              -{product.discount_percent}%
            </span>
          )}

          {/* Wishlist button */}
          <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 z-10">
            <WishlistButton productId={product.id} size={16} />
          </div>

          {/* Image count indicator */}
          {hasMultipleImages && (
            <div className="absolute top-2 right-10 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded z-10">
              {currentImageIndex + 1}/{displayImages.length}
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 truncate">{product.vendor_name}</p>
          <h3 className="text-sm font-medium leading-snug line-clamp-2 mt-0.5">{product.name}</h3>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-bold">{formatKES(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-xs text-neutral-400 line-through">{formatKES(product.compare_at_price)}</span>
            )}
          </div>
          {product.rating_count > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <Star size={12} className="fill-[var(--color-signal)] text-[var(--color-signal)]" />
              {product.rating_avg} ({product.rating_count})
            </div>
          )}
        </div>
      </Link>
      
      <button
        onClick={() => addItem(product.id, 1)}
        className="w-full bg-[var(--color-ink)] text-white text-xs font-semibold uppercase tracking-wide py-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        Add to cart
      </button>
    </div>
  );
}