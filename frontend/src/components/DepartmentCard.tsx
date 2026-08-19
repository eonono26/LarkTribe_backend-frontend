// DepartmentCard.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Department, DepartmentMedia } from '@/lib/types';

interface DepartmentCardProps {
  department: Department;
  color: string;
  label: string;
}

export default function DepartmentCard({ department, color, label }: DepartmentCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Safe access with optional chaining and fallbacks
  const allMedia = [...(department?.images || []), ...(department?.videos || [])];
  const hasMultipleMedia = allMedia.length > 1;
  const currentMedia = allMedia[currentIndex] || null;
  const isVideo = currentMedia?.media_type === 'video';

  useEffect(() => {
    if (!isHovering || isVideo) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (isHovering && hasMultipleMedia && !isVideo) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % allMedia.length);
      }, 2500);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovering, hasMultipleMedia, allMedia.length, isVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (isHovering) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isHovering, isVideo]);

  const handleVideoEnd = () => {
    if (hasMultipleMedia) {
      setCurrentIndex((prev) => (prev + 1) % allMedia.length);
    }
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (!isVideo) {
      setCurrentIndex(0);
    }
  };

  const imageUrl = currentMedia?.file_url || null;

  // If department is missing, show a placeholder
  if (!department) {
    return (
      <div className="group block rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
        <div className="relative h-96 w-full bg-gray-200 animate-pulse"></div>
        <div className="p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/category/${department.slug}`}
      className="group block rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Increased height from h-72 to h-96 (384px) */}
      <div className="relative h-96 w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {imageUrl ? (
          <>
            {isVideo ? (
              <video
                ref={videoRef}
                src={imageUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                onEnded={handleVideoEnd}
              />
            ) : (
              <Image
                src={imageUrl}
                alt={currentMedia?.alt_text || label || department.name}
                fill
                className={`
                  object-cover transition-all duration-700
                  ${isHovering ? 'scale-110' : 'scale-100'}
                `}
                sizes="(max-width: 768px) 50vw, 25vw"
                priority
              />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

            {/* Department label */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-2xl font-bold text-white drop-shadow-lg tracking-tight">
                    {label || department.name}
                  </span>
                  {/* <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70 font-medium">
                      {department.product_count || 0} products
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    <span className="text-sm text-white/70 font-medium">
                      {department.category_count || 0} categories
                    </span>
                  </div> */}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3.5 border border-white/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative accent line */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300"
              style={{ 
                background: `linear-gradient(90deg, ${color || '#c96e6e'}, ${color || '#c96e6e'}dd, ${color || '#c96e6e'}88)`,
                transform: isHovering ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left'
              }}
            />

            {/* Progress indicators */}
            {/* {hasMultipleMedia && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2.5">
                {allMedia.map((_, idx) => (
                  <div
                    key={idx}
                    className={`
                      rounded-full transition-all duration-300
                      ${idx === currentIndex 
                        ? 'w-10 h-2 bg-white' 
                        : 'w-2 h-2 bg-white/40'
                      }
                    `}
                  />
                ))}
              </div>
            )} */}

            {/* Navigation arrows - Larger */}
            {/* {hasMultipleMedia && isHovering && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white rounded-full p-3 transition-all duration-200 border border-white/30"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white rounded-full p-3 transition-all duration-200 border border-white/30"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )} */}

            {/* Play button overlay - Larger */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/20 backdrop-blur-md rounded-full p-6 border border-white/40 shadow-2xl">
                  <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: (color || '#c96e6e') + '15' }}>
            <div 
              className="h-32 w-32 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: `linear-gradient(135deg, ${color || '#c96e6e'}, ${color || '#c96e6e'}cc)` }}
            >
              <span className="text-5xl text-white font-bold">
                {(label || department.name || '?').charAt(0)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}