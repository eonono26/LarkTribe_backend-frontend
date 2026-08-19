'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { DepartmentMedia, CategoryMedia } from '@/lib/types';

interface MediaGalleryProps {
  media: (DepartmentMedia | CategoryMedia)[];
  className?: string;
}

export default function MediaGallery({ media, className = '' }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<DepartmentMedia | CategoryMedia | null>(
    media.find(m => m.is_primary) || media[0] || null
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const images = media.filter(m => m.media_type === 'image');
  const videos = media.filter(m => m.media_type === 'video');
  const allMedia = [...images, ...videos];

  // Get first two media items
  const firstMedia = allMedia[0] || null;
  const secondMedia = allMedia[1] || null;

  if (allMedia.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-xl flex items-center justify-center p-8 ${className}`}>
        <span className="text-gray-400">No media available</span>
      </div>
    );
  }

  const renderMediaItem = (item: DepartmentMedia | CategoryMedia, isMain: boolean = true) => {
    if (!item) return null;

    return (
      <div 
        className={`relative bg-black/5 rounded-xl overflow-hidden ${isMain ? 'aspect-video' : 'aspect-square'}`}
        onClick={() => {
          setSelectedMedia(item);
          if (item.media_type === 'video') {
            setIsVideoPlaying(true);
          }
        }}
      >
        {item.media_type === 'video' ? (
          <video
            src={item.file_url}
            className="w-full h-full object-cover cursor-pointer"
            muted
            playsInline
            poster={images[0]?.file_url}
          />
        ) : (
          <Image
            src={item.file_url}
            alt={item.alt_text || 'Media image'}
            fill
            className="object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        )}
        
        {/* Media type badge */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
          {item.media_type === 'video' ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Video
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
              Image
            </>
          )}
        </div>

        {item.is_primary && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
            <span>★</span>
            <span className="hidden sm:inline">Primary</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Two media items side by side */}
      <div className="grid grid-cols-2 gap-3">
        {firstMedia && renderMediaItem(firstMedia)}
        {secondMedia ? (
          renderMediaItem(secondMedia)
        ) : (
          <div className="bg-gray-100 rounded-xl flex items-center justify-center aspect-video">
            <span className="text-gray-400 text-sm">No media</span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 2 && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {allMedia.slice(2).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedMedia(item);
                if (item.media_type === 'video') {
                  setIsVideoPlaying(true);
                }
              }}
              className={`
                relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200
                ${selectedMedia?.id === item.id 
                  ? 'border-blue-500 ring-2 ring-blue-200 ring-offset-1' 
                  : 'border-transparent hover:border-gray-300 hover:scale-105'
                }
              `}
            >
              {item.media_type === 'video' ? (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white text-lg">▶</span>
                  </div>
                </div>
              ) : (
                <Image
                  src={item.file_url}
                  alt={item.alt_text || 'Thumbnail'}
                  fill
                  className="object-cover hover:scale-110 transition-transform duration-300"
                  sizes="(max-width: 768px) 25vw, 12.5vw"
                />
              )}
              {item.is_primary && (
                <div className="absolute top-1 right-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-md">
                  ★
                </div>
              )}
              {item.media_type === 'video' && (
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                  🎬
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}