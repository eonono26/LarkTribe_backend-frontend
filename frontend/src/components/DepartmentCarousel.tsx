// DepartmentCarousel.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import DepartmentCard from './DepartmentCard';
import type { Department } from '@/lib/types';

interface DepartmentCarouselProps {
  departments?: Department[];
  colors?: Record<string, string>;
  labels?: Record<string, string>;
}

export default function DepartmentCarousel({ 
  departments = [],
  colors = {},
  labels = {}
}: DepartmentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);
  
  const getVisibleItems = useCallback(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1.1;
    if (window.innerWidth < 768) return 1.2;
    if (window.innerWidth < 1024) return 2.2;
    if (window.innerWidth < 1280) return 3.2;
    return 3.2;
  }, []);

  const [visibleItems, setVisibleItems] = useState(3);
  const totalItems = departments?.length || 0;

  useEffect(() => {
    const updateVisibleItems = () => {
      setVisibleItems(getVisibleItems());
    };
    
    updateVisibleItems();
    window.addEventListener('resize', updateVisibleItems);
    return () => window.removeEventListener('resize', updateVisibleItems);
  }, [getVisibleItems]);

  useEffect(() => {
    if (!isHovering && !isDragging && totalItems > Math.floor(visibleItems)) {
      autoScrollInterval.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = prev + 1;
          return nextIndex >= totalItems ? 0 : nextIndex;
        });
      }, 4000);
    } else {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    }

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    };
  }, [isHovering, isDragging, totalItems, visibleItems]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const cardWidth = container.querySelector('.carousel-item')?.clientWidth || 340;
    const gap = 24;
    const scrollPosition = currentIndex * (cardWidth + gap);
    
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  }, [currentIndex]);

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < totalItems - Math.floor(visibleItems);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (direction === 'left' && canScrollLeft) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === 'right' && canScrollRight) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = carouselRef.current;
    if (container) {
      setIsDragging(true);
      setStartX(e.pageX - container.offsetLeft);
      setScrollLeft(container.scrollLeft);
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const container = carouselRef.current;
    if (container) {
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    const container = carouselRef.current;
    if (container) {
      setIsDragging(false);
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
      
      const cardWidth = container.querySelector('.carousel-item')?.clientWidth || 340;
      const gap = 24;
      const newIndex = Math.round(container.scrollLeft / (cardWidth + gap));
      setCurrentIndex(Math.min(newIndex, totalItems - Math.floor(visibleItems)));
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (!isDragging) {
      const container = carouselRef.current;
      if (container) {
        container.style.cursor = 'grab';
        container.style.userSelect = 'auto';
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = carouselRef.current;
    if (container) {
      const touch = e.touches[0];
      setStartX(touch.pageX - container.offsetLeft);
      setScrollLeft(container.scrollLeft);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const container = carouselRef.current;
    if (container) {
      const touch = e.touches[0];
      const x = touch.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchEnd = () => {
    const container = carouselRef.current;
    if (container) {
      setIsDragging(false);
      const cardWidth = container.querySelector('.carousel-item')?.clientWidth || 340;
      const gap = 24;
      const newIndex = Math.round(container.scrollLeft / (cardWidth + gap));
      setCurrentIndex(Math.min(newIndex, totalItems - Math.floor(visibleItems)));
    }
  };

  // Early return if no departments
  if (!departments || departments.length === 0) {
    return (
      <div className="relative py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Shop by Department
            </h2>
            <p className="text-sm text-gray-500 mt-1">Loading departments...</p>
          </div>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[320px] md:w-[340px] lg:w-[360px]">
              <div className="bg-gray-200 rounded-2xl h-96 w-full animate-pulse"></div>
              <div className="mt-3 h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative py-8">
      {/* Header with gradient accent */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Shop by Department
          </h2>
          {/* <p className="text-sm text-gray-500 mt-1">Explore our curated collections</p> */}
        </div>
        {/* <Link 
          href="/categories"
          className="text-sm font-medium text-[#c96e6e] hover:text-[#a85555] transition-colors flex items-center gap-1"
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link> */}
      </div>
      
      <div 
        ref={carouselRef}
        className="flex overflow-x-auto gap-6 pb-4 scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: 'grab',
          WebkitOverflowScrolling: 'touch',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollBehavior: 'smooth'
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {departments.map((dept, index) => {
          const color = colors?.[dept.slug as keyof typeof colors] || "#9CA3AF";
          const label = labels?.[dept.slug as keyof typeof labels] || dept.name;
          
          return (
            <div 
              key={dept.slug || index}
              // Increased width: from w-[260px] to w-[320px] (mobile), w-[340px] (tablet), w-[360px] (desktop)
              className="carousel-item flex-shrink-0 w-[320px] md:w-[340px] lg:w-[360px]"
            >
              <DepartmentCard
                department={dept}
                color={color}
                label={label}
              />
            </div>
          );
        })}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Navigation Buttons - Larger and more prominent */}
      {totalItems > Math.floor(visibleItems) && (
        <>
          <button
            onClick={() => scrollCarousel('left')}
            className={`
              absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 
              bg-white/90 backdrop-blur-sm shadow-2xl rounded-full p-4 hover:bg-white 
              transition-all duration-300 hover:scale-110 z-10 
              hidden md:flex items-center justify-center
              border-2 border-gray-100
              ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            aria-label="Scroll left"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => scrollCarousel('right')}
            className={`
              absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 
              bg-white/90 backdrop-blur-sm shadow-2xl rounded-full p-4 hover:bg-white 
              transition-all duration-300 hover:scale-110 z-10 
              hidden md:flex items-center justify-center
              border-2 border-gray-100
              ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            aria-label="Scroll right"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators - Larger */}
      {/* {totalItems > Math.floor(visibleItems) && (
        <div className="flex justify-center gap-3 mt-6">
          {Array.from({ length: Math.min(totalItems, 8) }).map((_, idx) => {
            const isActive = idx === Math.floor(currentIndex / Math.floor(visibleItems));
            return (
              <button
                key={idx}
                onClick={() => {
                  const newIndex = idx * Math.floor(visibleItems);
                  setCurrentIndex(Math.min(newIndex, totalItems - Math.floor(visibleItems)));
                }}
                className={`
                  rounded-full transition-all duration-300
                  ${isActive 
                    ? 'w-10 h-2.5 bg-[#c96e6e] shadow-md' 
                    : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                  }
                `}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>
      )} */}
    </div>
  );
}