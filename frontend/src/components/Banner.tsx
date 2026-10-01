"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import type { Campaign } from "@/lib/types";

function BannerLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  if (!href) return <>{children}</>;
  return <Link href={href}>{children}</Link>;
}

/**
 * Compact Hero Banner
 *
 * Short, wide promotional carousel banner.
 * The same compact proportions are used across
 * mobile, tablet and desktop.
 */
export function HeroBanner({
  campaign,
  isActive = true,
}: {
  campaign: Campaign;
  isActive?: boolean;
}) {
  const href = campaign.link_url || "/";

  if (!campaign.image) return null;

  return (
    <BannerLink href={href}>
      <div
        className={`
          group
          relative
          w-full
          aspect-[16/4]
          overflow-hidden
          bg-[var(--color-mist)]
          shadow-md
          ring-1
          ring-black/5
          flex-shrink-0
          transition-opacity
          duration-700
          ${isActive ? "opacity-100" : "opacity-0"}
        `}
      >
        <Image
          src={mediaUrl(campaign.image)}
          alt={campaign.title || "Banner"}
          fill
          sizes="100vw"
          className="
            object-cover
            transition-transform
            duration-[1200ms]
            ease-out
            group-hover:scale-[1.03]
          "
          priority={isActive}
        />

        {/* Subtle readability overlay */}
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-black/50
            via-black/15
            to-transparent
          "
        />
      </div>
    </BannerLink>
  );
}

/**
 * Auto-sliding compact hero banner
 */
export function BannerGroup({
  campaigns,
  placement,
  departmentId,
  styles,
  slideInterval = 5000,
}: {
  campaigns: Campaign[];
  placement: "homepage_banner" | "category_banner";
  departmentId?: number;
  styles?: Campaign["style"][];
  slideInterval?: number;
}) {
  // Filter campaigns
  const matches = campaigns.filter(
    (c) =>
      c.placement === placement &&
      c.is_live &&
      c.image &&
      (!departmentId ||
        !c.department ||
        c.department === departmentId) &&
      (!styles || styles.includes(c.style))
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // No campaigns
  if (matches.length === 0) {
    return null;
  }

  // Single campaign
  if (matches.length === 1) {
    return (
      <div className="w-full px-0 pt-2">
        <HeroBanner
          campaign={matches[0]}
          isActive={true}
        />
      </div>
    );
  }

  /**
   * Go to selected slide
   */
  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      setCurrentIndex(index);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 700);
    },
    [isTransitioning]
  );

  /**
   * Next slide
   */
  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % matches.length);
  }, [currentIndex, goToSlide, matches.length]);

  /**
   * Previous slide
   */
  const goToPrevious = useCallback(() => {
    goToSlide(
      (currentIndex - 1 + matches.length) % matches.length
    );
  }, [currentIndex, goToSlide, matches.length]);

  /**
   * Automatic slideshow
   */
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      goToNext();
    }, slideInterval);

    return () => clearInterval(timer);
  }, [goToNext, slideInterval, isPaused]);

  return (
    <div className="w-full px-0 pt-2">
      <div
        className="relative group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* ================================
            SLIDES
            ================================ */}
        <div className="relative overflow-hidden">
          <div
            className="
              flex
              transition-transform
              duration-700
              ease-in-out
            "
            style={{
              transform: `translateX(-${
                currentIndex * 100
              }%)`,
            }}
          >
            {matches.map((campaign, index) => (
              <div
                key={campaign.id || index}
                className="min-w-full"
              >
                <HeroBanner
                  campaign={campaign}
                  isActive={index === currentIndex}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ================================
            PREVIOUS ARROW
            ================================ */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={goToPrevious}
          className="
            absolute
            left-2
            top-1/2
            -translate-y-1/2
            z-10

            flex
            h-8
            w-8
            md:h-9
            md:w-9

            items-center
            justify-center

            rounded-full
            bg-white/90

            shadow-md

            backdrop-blur-sm

            transition-all
            duration-200

            hover:bg-white
            hover:scale-105

            opacity-0
            group-hover:opacity-100
            sm:opacity-100
          "
        >
          <ChevronLeft
            className="
              h-4
              w-4
              md:h-5
              md:w-5
              text-[var(--color-ink)]
            "
          />
        </button>

        {/* ================================
            NEXT ARROW
            ================================ */}
        <button
          type="button"
          aria-label="Next slide"
          onClick={goToNext}
          className="
            absolute
            right-2
            top-1/2
            -translate-y-1/2
            z-10

            flex
            h-8
            w-8
            md:h-9
            md:w-9

            items-center
            justify-center

            rounded-full
            bg-white/90

            shadow-md

            backdrop-blur-sm

            transition-all
            duration-200

            hover:bg-white
            hover:scale-105

            opacity-0
            group-hover:opacity-100
            sm:opacity-100
          "
        >
          <ChevronRight
            className="
              h-4
              w-4
              md:h-5
              md:w-5
              text-[var(--color-ink)]
            "
          />
        </button>

        {/* ================================
            SLIDE INDICATORS
            ================================ */}
        <div
          className="
            absolute
            bottom-2
            left-1/2
            -translate-x-1/2
            z-10

            flex
            items-center
            gap-1.5
          "
        >
          {matches.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => goToSlide(index)}
              className={`
                h-1.5
                rounded-full
                transition-all
                duration-300
                ${
                  index === currentIndex
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/60 hover:bg-white/80"
                }
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
}