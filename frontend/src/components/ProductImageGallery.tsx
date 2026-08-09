'use client';

import { useState } from 'react';
import Image from 'next/image';
import { mediaUrl } from '@/lib/api';

interface ProductImageGalleryProps {
  images: Array<{ id: number; image: string; alt_text: string; order: number }>;
  productName: string;
  discountPercent?: number;
  productId: number;
}

export default function ProductImageGallery({ 
  images, 
  productName, 
  discountPercent,
  productId 
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-[3/4] bg-[var(--color-mist)] rounded-lg overflow-hidden">
        <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">
          No image yet
        </div>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div 
        className="relative aspect-[3/4] bg-[var(--color-mist)] rounded-lg overflow-hidden cursor-zoom-in"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
      >
        <Image
          src={mediaUrl(selectedImage.image)}
          alt={selectedImage.alt_text || productName}
          fill
          className={`object-cover transition-transform duration-300 ${
            isZoomed ? 'scale-150' : 'scale-100'
          }`}
          priority
        />
        
        {/* Discount Badge */}
        {discountPercent && discountPercent > 0 && (
          <span className="absolute top-3 left-3 bg-[var(--color-flag)] text-white text-xs font-bold px-2 py-1 rounded z-10">
            -{discountPercent}%
          </span>
        )}
        
        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={`
                relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                ${selectedIndex === index 
                  ? 'border-[var(--color-ink)] ring-2 ring-[var(--color-ink)]/20' 
                  : 'border-transparent hover:border-gray-300'
                }
              `}
            >
              <Image
                src={mediaUrl(image.image)}
                alt={image.alt_text || productName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 10vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}