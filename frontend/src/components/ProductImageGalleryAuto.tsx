'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { mediaUrl } from '@/lib/api';

interface ProductImageGalleryAutoProps {
  images: Array<{ id: number; image: string; alt_text: string; order: number }>;
  productName: string;
  discountPercent?: number;
  autoSlideInterval?: number;
}

export default function ProductImageGalleryAuto({ 
  images, 
  productName, 
  discountPercent,
  autoSlideInterval = 3000 
}: ProductImageGalleryAutoProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isHovering && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setSelectedIndex((prev) => (prev + 1) % images.length);
      }, autoSlideInterval);
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
  }, [isHovering, images.length, autoSlideInterval]);

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

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div 
      className="space-y-4"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Main Image */}
      <div className="relative aspect-[3/4] bg-[var(--color-mist)] rounded-lg overflow-hidden">
        <Image
          src={mediaUrl(selectedImage.image)}
          alt={selectedImage.alt_text || productName}
          fill
          className="object-cover"
          priority
        />
        
        {/* Discount Badge */}
        {discountPercent && discountPercent > 0 && (
          <span className="absolute top-3 left-3 bg-[var(--color-flag)] text-white text-xs font-bold px-2 py-1 rounded z-10">
            -{discountPercent}%
          </span>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all z-10"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all z-10"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
            {selectedIndex + 1} / {images.length}
          </div>
        )}

        {/* Progress Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`
                  h-1.5 rounded-full transition-all duration-300
                  ${idx === selectedIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}
                `}
              />
            ))}
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