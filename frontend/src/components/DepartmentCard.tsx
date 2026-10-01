// DepartmentCard.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Department } from '@/lib/types';

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

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (!isVideo) {
      setCurrentIndex(0);
    }
  };

  const imageUrl = currentMedia?.file_url || null;

  if (!department) {
    return (
      <div className="block rounded-2xl overflow-hidden bg-[var(--color-mist)] shadow-sm">
        <div className="relative aspect-[4/5] w-full bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <Link
      href={`/category/${department.slug}`}
      className="group block rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Aspect-ratio based so it scales cleanly at every card size instead of a fixed 384px tall box */}
      <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
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
                  object-cover transition-transform duration-500
                  ${isHovering ? 'scale-105' : 'scale-100'}
                `}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            {/* Department label */}
            <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
              <span className="block font-display text-sm sm:text-lg font-bold text-white drop-shadow-lg tracking-tight truncate">
                {label || department.name}
              </span>
              {typeof department.product_count === 'number' && department.product_count > 0 && (
                <span className="text-[10px] sm:text-xs text-white/75 font-medium">
                  {department.product_count} items
                </span>
              )}
            </div>

            {/* Decorative accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 scale-x-0 group-hover:scale-x-100"
              style={{
                background: `linear-gradient(90deg, ${color || 'var(--color-accent)'}, ${color || 'var(--color-accent)'}88)`,
                transformOrigin: 'left',
              }}
            />

            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/20 backdrop-blur-md rounded-full p-4 sm:p-6 border border-white/40 shadow-2xl">
                  <svg className="w-8 h-8 sm:w-14 sm:h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: (color || 'var(--color-accent)') + '15' }}>
            <div
              className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: `linear-gradient(135deg, ${color || 'var(--color-accent)'}, ${color || 'var(--color-accent)'}cc)` }}
            >
              <span className="text-2xl sm:text-4xl text-white font-bold">
                {(label || department.name || '?').charAt(0)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
