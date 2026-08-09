'use client';

import { useState, useEffect, useRef } from 'react';
import DepartmentCard from './DepartmentCard';
import type { Department } from '@/lib/types';

interface DepartmentCarouselProps {
  departments: Department[];
  colors: Record<string, string>;
  labels: Record<string, string>;
}

export default function DepartmentCarousel({ 
  departments, 
  colors, 
  labels 
}: DepartmentCarouselProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scrollSpeed = 0.5;

  // Duplicate departments for infinite scroll effect
  const duplicatedDepartments = [...departments, ...departments, ...departments];

  // Check scroll position for button visibility
  const checkScrollPosition = () => {
    const container = carouselRef.current;
    if (container) {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      // Add a small threshold for better UX
      const threshold = 5;
      setCanScrollLeft(currentScroll > threshold);
      setCanScrollRight(currentScroll < scrollWidth - clientWidth - threshold);
    }
  };

  // Auto-scroll functionality with requestAnimationFrame for smoother animation
  useEffect(() => {
    if (!isHovering && !isDragging && carouselRef.current) {
      let lastTime = 0;
      
      const autoScroll = (timestamp: number) => {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        
        if (delta >= 16) {
          const container = carouselRef.current;
          if (container) {
            const maxScroll = container.scrollWidth - container.clientWidth;
            const currentScroll = container.scrollLeft;
            const newPosition = currentScroll + scrollSpeed;
            
            if (newPosition >= maxScroll) {
              const middleScroll = container.scrollWidth / 3;
              container.scrollTo({
                left: middleScroll,
                behavior: 'auto'
              });
              // Update button states after reset
              setTimeout(checkScrollPosition, 50);
            } else {
              container.scrollTo({
                left: newPosition,
                behavior: 'smooth'
              });
            }
          }
          lastTime = timestamp;
        }
        
        animationFrameRef.current = requestAnimationFrame(autoScroll);
      };
      
      animationFrameRef.current = requestAnimationFrame(autoScroll);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isHovering, isDragging]);

  // Handle mouse wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    const container = carouselRef.current;
    if (container) {
      const canScrollHorizontally = 
        (e.deltaY > 0 && container.scrollLeft < container.scrollWidth - container.clientWidth) ||
        (e.deltaY < 0 && container.scrollLeft > 0);
      
      if (canScrollHorizontally) {
        e.preventDefault();
        const scrollAmount = e.deltaY > 0 ? 100 : -100;
        container.scrollTo({
          left: container.scrollLeft + scrollAmount,
          behavior: 'smooth'
        });
        setTimeout(checkScrollPosition, 150);
      }
    }
  };

  // Handle drag/mouse scroll
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
      checkScrollPosition();
    }
  };

  const handleMouseUp = () => {
    const container = carouselRef.current;
    if (container) {
      setIsDragging(false);
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
      setTimeout(checkScrollPosition, 150);
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

  // Touch support for mobile
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
      checkScrollPosition();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTimeout(checkScrollPosition, 150);
  };

  // Scroll to middle on initial load for seamless loop
  useEffect(() => {
    const container = carouselRef.current;
    if (container && duplicatedDepartments.length > 0) {
      setTimeout(() => {
        const middleScroll = container.scrollWidth / 3;
        container.scrollTo({
          left: middleScroll,
          behavior: 'auto'
        });
        setTimeout(checkScrollPosition, 100);
      }, 100);
    }
  }, []);

  // Check scroll position on window resize
  useEffect(() => {
    const handleResize = () => {
      checkScrollPosition();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll function with smooth loop handling
  const scrollCarousel = (direction: 'left' | 'right') => {
    const container = carouselRef.current;
    if (!container) return;

    // Calculate how many items to scroll (scroll by 2 items)
    const itemWidth = 220; // Approximate width of each card including gap
    const scrollAmount = itemWidth * 2;
    
    const currentScroll = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    let newPosition;

    if (direction === 'left') {
      newPosition = Math.max(0, currentScroll - scrollAmount);
    } else {
      newPosition = Math.min(maxScroll, currentScroll + scrollAmount);
    }

    // If at the end, jump to the middle for seamless loop
    if (newPosition >= maxScroll - 10) {
      const middleScroll = container.scrollWidth / 3;
      container.scrollTo({
        left: middleScroll,
        behavior: 'smooth'
      });
    } else if (newPosition <= 10) {
      const middleScroll = container.scrollWidth / 3;
      container.scrollTo({
        left: middleScroll - scrollAmount,
        behavior: 'smooth'
      });
    } else {
      container.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
    }

    // Update button states after scroll completes
    setTimeout(checkScrollPosition, 400);
  };

  if (departments.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Shop by Title */}
      <h2 className="text-2xl font-bold mb-4">Shop by</h2>
      
      {/* Carousel Container - No scrollbar */}
      <div 
        ref={carouselRef}
        className="flex overflow-x-auto gap-4 pb-2"
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
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={checkScrollPosition}
      >
        {/* Department Cards - Duplicated for infinite scroll */}
        {duplicatedDepartments.map((dept, index) => {
          const color = colors[dept.slug as keyof typeof colors] || "#9CA3AF";
          const label = labels[dept.slug as keyof typeof labels] || dept.name;
          
          return (
            <div 
              key={`${dept.slug}-${index}`}
              className="flex-shrink-0 w-[200px] md:w-[220px] lg:w-[250px]"
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

      {/* Hide scrollbar for all browsers */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Scroll Indicators */}
      {departments.length > 4 && (
        <>
          {/* Left Gradient */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          
          {/* Right Gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />

          {/* Scroll Buttons - Left */}
          <button
            onClick={() => scrollCarousel('left')}
            className={`
              absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 
              bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 
              transition-all duration-200 hover:scale-110 z-10 
              hidden md:flex items-center justify-center
              ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            aria-label="Scroll left"
            disabled={!canScrollLeft}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Scroll Buttons - Right */}
          <button
            onClick={() => scrollCarousel('right')}
            className={`
              absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 
              bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 
              transition-all duration-200 hover:scale-110 z-10 
              hidden md:flex items-center justify-center
              ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            aria-label="Scroll right"
            disabled={!canScrollRight}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}