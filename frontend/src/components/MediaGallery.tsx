'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { DepartmentMedia, CategoryMedia } from '@/lib/types';

interface MediaGalleryProps {
  media: (DepartmentMedia | CategoryMedia)[];
  className?: string;
}

export default function MediaGallery({ media, className = '' }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<DepartmentMedia | CategoryMedia | null>(
    media.find(m => m.is_primary) || media[0] || null
  );

  const images = media.filter(m => m.media_type === 'image');
  const videos = media.filter(m => m.media_type === 'video');
  const allMedia = [...images, ...videos];

  const firstMedia = allMedia[0] || null;
  const secondMedia = allMedia[1] || null;

  if (allMedia.length === 0) {
    return (
      <div className={`bg-[var(--color-mist)] rounded-2xl flex items-center justify-center p-8 ${className}`}>
        <span className="text-neutral-400 text-sm">No media available</span>
      </div>
    );
  }

  const renderMediaItem = (item: DepartmentMedia | CategoryMedia, isMain: boolean = true) => {
    if (!item) return null;

    return (
      <div
        className={`relative bg-[var(--color-mist)] rounded-2xl overflow-hidden cursor-pointer ${isMain ? 'aspect-video' : 'aspect-square'}`}
        onClick={() => setSelectedMedia(item)}
      >
        {item.media_type === 'video' ? (
          <video
            src={item.file_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            poster={images[0]?.file_url}
          />
        ) : (
          <Image
            src={item.file_url}
            alt={item.alt_text || 'Media image'}
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        )}

        {item.media_type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play size={18} className="text-[var(--color-ink)] ml-0.5" fill="currentColor" />
            </div>
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
          <div className="bg-[var(--color-mist)] rounded-2xl flex items-center justify-center aspect-video">
            <span className="text-neutral-400 text-sm">No media</span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 2 && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {allMedia.slice(2).map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className={`
                relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200
                ${selectedMedia?.id === item.id
                  ? 'border-[var(--color-ink)]'
                  : 'border-transparent hover:border-[var(--color-line)] hover:scale-105'
                }
              `}
            >
              {item.media_type === 'video' ? (
                <div className="w-full h-full bg-[var(--color-ink)] flex items-center justify-center">
                  <Play size={14} className="text-white/90" fill="currentColor" />
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
