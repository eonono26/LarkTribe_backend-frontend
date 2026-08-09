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

  if (allMedia.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-400">No media available</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main display */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        {selectedMedia ? (
          selectedMedia.media_type === 'video' ? (
            <video
              src={selectedMedia.file_url}
              className="w-full h-full object-contain"
              controls
              autoPlay={isVideoPlaying}
              poster={images[0]?.file_url}
            />
          ) : (
            <Image
              src={selectedMedia.file_url}
              alt={selectedMedia.alt_text || 'Department image'}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-500">No media selected</span>
          </div>
        )}
        
        {/* Media type badge */}
        {selectedMedia && (
          <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
            {selectedMedia.media_type === 'video' ? '🎬 Video' : '📷 Image'}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {allMedia.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedMedia(item);
                if (item.media_type === 'video') {
                  setIsVideoPlaying(true);
                }
              }}
              className={`
                relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                ${selectedMedia?.id === item.id 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-transparent hover:border-gray-300'
                }
              `}
            >
              {item.media_type === 'video' ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <span className="text-2xl">▶️</span>
                </div>
              ) : (
                <Image
                  src={item.file_url}
                  alt={item.alt_text || 'Thumbnail'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 12.5vw"
                />
              )}
              {item.is_primary && (
                <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                  ★
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}