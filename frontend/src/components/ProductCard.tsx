"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Star, ImageOff, Plus, Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number;
  image?: string | null;
  image_url?: string | null;
  images?: any[];
  rating_avg?: number;
  rating_count?: number;
  discount_percent?: number;
  category_name?: string;
  vendor_name?: string;
  stock?: number;
  status?: string;
  colors?: string[];
  sizes?: string[];
  description?: string;
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f8f0f0'/%3E%3Ctext x='200' y='200' font-family='Arial' font-size='16' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const { addItem } = useCart();
  const { formatPrice } = useLocalization();
  const autoSlideInterval = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { 
    id, 
    name, 
    slug, 
    price, 
    compare_at_price, 
    image_url,
    image,
    images: productImages = [],
    rating_avg = 4.5, 
    rating_count = 0,
    discount_percent = 0,
    category_name,
    vendor_name,
    stock = 0,
    colors = [],
    sizes = []
  } = product;

  const isInStock = stock > 0;
  const discount = compare_at_price && price < compare_at_price 
    ? Math.round(((compare_at_price - price) / compare_at_price) * 100)
    : discount_percent || 0;

  // Extract image URL from various formats
  const extractImageUrl = (img: any): string | null => {
    if (!img) return null;
    
    if (typeof img === 'string') {
      return img.trim() || null;
    }
    
    if (typeof img === 'object') {
      if (img.image) return extractImageUrl(img.image);
      if (img.file_url) return img.file_url;
      if (img.file) return img.file;
      if (img.url) return img.url;
    }
    
    return null;
  };

  // Build full URL - FIXED: Remove /api from the base URL
  const buildFullUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    // Remove /api from the base URL if present
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/api$/, '');
    return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  // Get all image URLs with full paths
  const getImages = (): string[] => {
    const urls: string[] = [];
    
    if (image_url) {
      const url = extractImageUrl(image_url);
      if (url) {
        const fullUrl = buildFullUrl(url);
        if (fullUrl) urls.push(fullUrl);
      }
    }
    
    if (image) {
      const url = extractImageUrl(image);
      if (url) {
        const fullUrl = buildFullUrl(url);
        if (fullUrl) urls.push(fullUrl);
      }
    }
    
    if (productImages && productImages.length > 0) {
      for (const img of productImages) {
        const url = extractImageUrl(img);
        if (url) {
          const fullUrl = buildFullUrl(url);
          if (fullUrl) urls.push(fullUrl);
        }
      }
    }
    
    // Remove duplicates
    const validUrls = [...new Set(urls)].filter(url => url && url.trim() !== '');
    
    if (validUrls.length > 0) {
      return validUrls;
    }
    
    return [PLACEHOLDER_IMAGE];
  };

  const images = getImages();
  const hasMultipleImages = images.length > 1;

  // Check mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-slide images - ONLY when hovering
  useEffect(() => {
    if (autoSlideInterval.current) {
      clearInterval(autoSlideInterval.current);
      autoSlideInterval.current = null;
    }

    const shouldSlide = hasMultipleImages && isHovering;
    
    if (shouldSlide) {
      autoSlideInterval.current = setInterval(() => {
        const nextIndex = (currentImageIndex + 1) % images.length;
        setCurrentImageIndex(nextIndex);
        setImageErrors(prev => ({
          ...prev,
          [nextIndex]: false
        }));
      }, 3000);
    }

    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
        autoSlideInterval.current = null;
      }
    };
  }, [isHovering, hasMultipleImages, images.length, currentImageIndex, images]);

  // Reset to first image when hover ends
  useEffect(() => {
    if (!isHovering && hasMultipleImages) {
      setCurrentImageIndex(0);
    }
  }, [isHovering, hasMultipleImages]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isInStock) return;
    
    setIsAddingToCart(true);
    try {
      const productId = typeof id === 'string' ? parseInt(id, 10) : id;
      await addItem(productId, 1);
      setTimeout(() => setIsAddingToCart(false), 1500);
    } catch (error) {
      setIsAddingToCart(false);
      console.error("Error adding to cart:", error);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const handleImageError = (index: number) => {
    console.error(`[ProductCard ${id}] Image ${index} failed to load:`, images[index]);
    setImageErrors(prev => ({
      ...prev,
      [index]: true
    }));
  };

  const hasCurrentImageError = imageErrors[currentImageIndex] || false;
  const displayImage = hasCurrentImageError ? PLACEHOLDER_IMAGE : images[currentImageIndex] || PLACEHOLDER_IMAGE;

  return (
    <div 
      className={`
        group relative bg-white rounded-xl overflow-hidden 
        shadow-sm hover:shadow-lg transition-all duration-300
        border border-gray-100 hover:border-[#c96e6e]/20
        ${className}
      `}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-square bg-[#f8f0f0] overflow-hidden">
        <Link href={`/product/${slug}`} className="block w-full h-full">
          {/* Main Image */}
          {!hasCurrentImageError ? (
            <Image
              key={`${id}-${currentImageIndex}`}
              src={displayImage}
              alt={name}
              fill
              className={`
                object-cover transition-all duration-700 ease-in-out
                ${isHovering ? 'scale-105' : 'scale-100'}
              `}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={currentImageIndex === 0}
              onError={() => handleImageError(currentImageIndex)}
              unoptimized={displayImage.startsWith('data:')}
              onLoad={() => {
                if (imageErrors[currentImageIndex]) {
                  setImageErrors(prev => ({
                    ...prev,
                    [currentImageIndex]: false
                  }));
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <ImageOff size={32} className="mb-1 opacity-50" />
              <span className="text-[10px]">No Image</span>
            </div>
          )}

          {/* Out of Stock Overlay */}
          {!isInStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white/90 text-gray-800 px-3 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm">
                Out of Stock
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-0.5">
            {discount > 0 && (
              <span className="px-2 py-0.5 bg-[#e74c3c] text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                -{discount}%
              </span>
            )}
            {!isInStock && (
              <span className="px-2 py-0.5 bg-gray-600 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                Sold Out
              </span>
            )}
          </div>

          {/* Progress dots - only show when hovering */}
          {hasMultipleImages && isHovering && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                    setImageErrors(prev => ({
                      ...prev,
                      [idx]: false
                    }));
                  }}
                  className={`
                    h-1 rounded-full transition-all duration-300 cursor-pointer
                    ${idx === currentImageIndex 
                      ? 'w-4 bg-white' 
                      : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }
                  `}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className={`
              absolute top-2 right-2 bg-white hover:bg-[#f8e8e8] text-gray-600 hover:text-[#c96e6e] rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110
              ${isHovering ? 'opacity-100' : 'opacity-0'}
            `}
            aria-label="Add to wishlist"
          >
            <Heart size={15} className={isWishlisted ? 'fill-[#c96e6e] text-[#c96e6e]' : ''} />
          </button>
        </Link>
      </div>

      {/* Product Info */}
      <div className="p-2.5 space-y-0.5">
        <Link href={`/product/${slug}`} className="block">
          <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-gray-400 font-medium truncate">
            {vendor_name && <span className="truncate">{vendor_name}</span>}
            {vendor_name && category_name && <span className="text-gray-300">•</span>}
            {category_name && <span className="truncate">{category_name}</span>}
          </div>

          <h3 className="text-[11px] font-medium text-gray-800 line-clamp-1 hover:text-[#c96e6e] transition-colors">
            {name}
          </h3>

          {rating_count > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={`
                      ${i < Math.floor(rating_avg) 
                        ? 'fill-[#f5a623] text-[#f5a623]' 
                        : 'fill-gray-200 text-gray-200'
                      }
                    `}
                  />
                ))}
              </div>
              <span className="text-[9px] text-gray-400">({rating_count})</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900">
                {formatPrice(price)}
              </span>
              {compare_at_price && compare_at_price > price && (
                <span className="text-[9px] text-gray-400 line-through">
                  {formatPrice(compare_at_price)}
                </span>
              )}
            </div>
            
            {isInStock ? (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className={`
                  rounded-full p-1 transition-all duration-300
                  flex items-center justify-center
                  ${isAddingToCart 
                    ? 'bg-green-500 text-white w-6 h-6' 
                    : 'bg-[#c96e6e] hover:bg-[#a85555] text-white hover:scale-110 w-6 h-6'
                  }
                  shadow-sm hover:shadow-md
                `}
                aria-label="Add to cart"
              >
                {isAddingToCart ? (
                  <Check size={12} className="animate-in fade-in zoom-in" />
                ) : (
                  <Plus size={12} />
                )}
              </button>
            ) : (
              <button
                disabled
                className="rounded-full p-1 bg-gray-300 text-white w-6 h-6 flex items-center justify-center cursor-not-allowed"
                aria-label="Out of stock"
              >
                <span className="text-[8px] font-bold">✕</span>
              </button>
            )}
          </div>

          {colors && colors.length > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {colors.slice(0, 4).map((color, index) => (
                <div
                  key={index}
                  className="w-2.5 h-2.5 rounded-full border border-gray-200"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              {colors.length > 4 && (
                <span className="text-[7px] text-gray-400 font-medium">
                  +{colors.length - 4}
                </span>
              )}
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}