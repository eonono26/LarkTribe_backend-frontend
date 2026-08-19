"use client";

import Link from "next/link";
import type { AgeGroup } from "@/lib/types";

export default function AgeGroupNav({ ageGroups }: { ageGroups: AgeGroup[] }) {
  if (!ageGroups || ageGroups.length === 0) return null;

  // Helper function to get the display image/icon for an age group
  const getDisplayImage = (ag: AgeGroup) => {
    // Priority 1: Use primary image if available
    if (ag.primary_image?.file_url) {
      return ag.primary_image.file_url;
    }
    
    // Priority 2: Use first image from images array
    if (ag.images && ag.images.length > 0 && ag.images[0].file_url) {
      return ag.images[0].file_url;
    }
    
    // Priority 3: Use first image from media_files array
    if (ag.media_files && ag.media_files.length > 0) {
      const imageFile = ag.media_files.find(m => m.media_type === 'image');
      if (imageFile?.file_url) {
        return imageFile.file_url;
      }
    }
    
    return null;
  };

  // Helper function to get age range display
  const getAgeRangeDisplay = (ag: AgeGroup) => {
    if (ag.min_age_years !== null && ag.max_age_years !== null) {
      return `${ag.min_age_years}-${ag.max_age_years} years`;
    } else if (ag.min_age_years !== null) {
      return `${ag.min_age_years}+ years`;
    } else if (ag.max_age_years !== null) {
      return `Up to ${ag.max_age_years} years`;
    }
    return null;
  };

  return (
    <div className="mb-2">
      <h2 className="text-2xl font-bold mb-4">Shop by age</h2>
      <div
        className="flex gap-5 overflow-x-auto pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {ageGroups.map((ag) => {
          const imageUrl = getDisplayImage(ag);
          const ageRange = getAgeRangeDisplay(ag);
          
          return (
            <Link
              key={ag.slug}
              href={`/shop/age/${ag.slug}`}
              className="flex-shrink-0 w-60 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 overflow-hidden group"
            >
              {/* Image/Icon Container */}
              <div className="aspect-square w-full bg-gradient-to-br from-[var(--color-mist)] to-[var(--color-paper)] flex items-center justify-center relative">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={ag.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : ag.icon ? (
                  <span className="text-7xl"></span> //Replace{ag.icon}
                ) : (
                  <span className="text-7xl">👤</span>
                )}
                
                {/* Optional overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
              </div>
              
              {/* Content */}
              <div className="p-4 text-center">
                <h3 className="font-bold text-lg truncate">{ag.name}</h3>
                {/* {ageRange && (
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    {ageRange}
                  </p>
                )} */}
                {/* {ag.product_count !== undefined && ag.product_count > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-semibold bg-[var(--color-ink)] text-[var(--color-paper)] px-3 py-1 rounded-full inline-block">
                      {ag.product_count} products
                    </span>
                  </div>
                )} */}
                {/* Shop now indicator */}
                {/* <div className="mt-2 text-xs font-medium text-[var(--color-flag)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Shop now →
                </div> */}
              </div>
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}