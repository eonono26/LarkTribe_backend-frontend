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
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get all media (images and videos)
  const allMedia = [...(department.images || []), ...(department.videos || [])];
  const hasMultipleMedia = allMedia.length > 1;
  const currentMedia = allMedia[currentIndex] || null;

  // Auto-slide when hovering
  useEffect(() => {
    if (isHovering && hasMultipleMedia && !isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % allMedia.length);
      }, 2000); // Change slide every 2 seconds
    } else if (!isHovering || isPlaying) {
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
  }, [isHovering, hasMultipleMedia, allMedia.length, isPlaying]);

  // Handle video play/pause
  useEffect(() => {
    if (currentMedia?.media_type === 'video' && videoRef.current) {
      if (isHovering && !isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (!isHovering && isPlaying) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [currentMedia, isHovering, isPlaying]);

  // Reset index when not hovering
  useEffect(() => {
    if (!isHovering) {
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [isHovering]);

  // Handle video end - move to next media
  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (hasMultipleMedia) {
      setCurrentIndex((prev) => (prev + 1) % allMedia.length);
    }
  };

  const imageUrl = currentMedia?.file_url || null;
  const isVideo = currentMedia?.media_type === 'video';
  const imageCount = department.images?.length || 0;
  const videoCount = department.videos?.length || 0;

  return (
    <Link
      href={`/category/${department.slug}`}
      className="group bg-white border border-[var(--color-line)] rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
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
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
              />
            ) : (
              <Image
                src={imageUrl}
                alt={currentMedia?.alt_text || label}
                fill
                className={`
                  object-cover transition-transform duration-700
                  ${isHovering ? 'scale-110' : 'scale-100'}
                `}
                sizes="(max-width: 768px) 50vw, 20vw"
                priority
              />
            )}

            {/* Progress indicators for multiple media */}
            {hasMultipleMedia && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allMedia.map((_, idx) => (
                  <div
                    key={idx}
                    className={`
                      h-1 rounded-full transition-all duration-300
                      ${idx === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}
                    `}
                  />
                ))}
              </div>
            )}

            {/* Play button overlay for video */}
            {isVideo && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm transition-transform duration-300 hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ background: color + '20' }}
          >
            <div 
              className="h-20 w-20 rounded-full flex items-center justify-center"
              style={{ background: color }}
            >
              <span className="text-3xl text-white font-bold">
                {label.charAt(0)}
              </span>
            </div>
          </div>
        )}

        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Department name and info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-white drop-shadow-md">
              {label}
            </span>
            {/* {department.product_count > 0 && (
              <span className="text-sm text-white/90 drop-shadow-md bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                {department.product_count} products
              </span>
            )} */}
          </div>
        </div>
      </div>
    </Link>
  );
}