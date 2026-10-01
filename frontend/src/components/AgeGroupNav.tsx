"use client";

import Link from "next/link";
import Image from "next/image";
import type { AgeGroup } from "@/lib/types";
import {
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  useRef,
  useState,
  useEffect,
} from "react";

interface AgeGroupNavProps {
  // AgeGroup is age-only (stage: baby/kids/teens) — gender lives on
  // Product, not on AgeGroup, so there's a single list here rather than
  // separate boys/girls/unisex arrays.
  ageGroups: AgeGroup[];
}

export default function AgeGroupNav({
  ageGroups = [],
}: AgeGroupNavProps) {
  const scrollContainerRef =
    useRef<HTMLDivElement>(null);

  const [showLeftArrow, setShowLeftArrow] =
    useState(false);

  const [showRightArrow, setShowRightArrow] =
    useState(true);

  const [isDragging, setIsDragging] =
    useState(false);

  const [startX, setStartX] =
    useState(0);

  const [dragScrollLeft, setDragScrollLeft] =
    useState(0);

  const hasData = ageGroups.length > 0;

  /*
   * Remove duplicate slugs and sort by stage (baby -> kids -> teens),
   * then by order within the stage.
   */
  const sortedGroups = [...ageGroups]
    .filter(
      (group, index, self) =>
        index ===
        self.findIndex(
          (item) => item.slug === group.slug
        )
    )
    .sort((a, b) => {
      const stageOrder: Record<
        string,
        number
      > = {
        baby: 0,
        kids: 1,
        teens: 2,
      };

      const stageA =
        stageOrder[a.stage ?? "kids"] ?? 1;

      const stageB =
        stageOrder[b.stage ?? "kids"] ?? 1;

      if (stageA !== stageB) {
        return stageA - stageB;
      }

      return (
        (a.order ?? 0) -
        (b.order ?? 0)
      );
    });

  /*
   * Get the best available image.
   */
  const getDisplayImage = (
    ag: AgeGroup
  ): string | null => {
    if (ag.primary_image?.file_url) {
      return ag.primary_image.file_url;
    }

    if (ag.images?.length) {
      const image = ag.images.find(
        (item) => Boolean(item?.file_url)
      );

      if (image?.file_url) {
        return image.file_url;
      }
    }

    if (ag.media_files?.length) {
      const image = ag.media_files.find(
        (media) =>
          media.media_type === "image" &&
          Boolean(media.file_url)
      );

      if (image?.file_url) {
        return image.file_url;
      }
    }

    return null;
  };

  /*
   * Main display label.
   */
  const getDisplayLabel = (
    ag: AgeGroup
  ): string => {
    const name = ag.name;

    const sizeMatch = name.match(
      /Size\s+(XS|S|M|L|XL|XXL)/i
    );

    if (sizeMatch) {
      return sizeMatch[1].toUpperCase();
    }

    if (/\bTeen\b/i.test(name)) {
      return "TEEN";
    }

    return name.trim();
  };

  /*
   * Subtitle — the stage this age group belongs to (Baby / Kids / Teens).
   */
  const getSubtitleDisplay = (
    ag: AgeGroup
  ): string => {
    if (ag.stage_display) {
      return ag.stage_display;
    }

    const stage = ag.stage ?? "kids";

    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  /*
   * Stage styling — a clean ink-toned monogram fallback (first letter of
   * the age group name) instead of a cartoon emoji, so an age group
   * without a photo yet still reads as premium rather than placeholder-y.
   */
  const getStageColor = (
    stage?: AgeGroup["stage"]
  ) => {
    const colors = {
      baby: {
        accentBg:
          "bg-[var(--color-accent)]",
      },

      kids: {
        accentBg:
          "bg-[var(--color-teal)]",
      },

      teens: {
        accentBg:
          "bg-[var(--color-ink)]",
      },
    };

    return colors[stage ?? "kids"];
  };

  /*
   * Check horizontal scroll state.
   */
  const checkScroll = () => {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const {
      scrollLeft: currentScrollLeft,
      scrollWidth,
      clientWidth,
    } = container;

    setShowLeftArrow(
      currentScrollLeft > 10
    );

    setShowRightArrow(
      currentScrollLeft <
        scrollWidth -
          clientWidth -
          10
    );
  };

  /*
   * Scroll listeners.
   */
  useEffect(() => {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    checkScroll();

    container.addEventListener(
      "scroll",
      checkScroll
    );

    window.addEventListener(
      "resize",
      checkScroll
    );

    return () => {
      container.removeEventListener(
        "scroll",
        checkScroll
      );

      window.removeEventListener(
        "resize",
        checkScroll
      );
    };
  }, [sortedGroups.length]);

  /*
   * Scroll with arrows.
   */
  const scroll = (
    direction: "left" | "right"
  ) => {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const scrollAmount =
      container.clientWidth * 0.8;

    container.scrollBy({
      left:
        direction === "left"
          ? -scrollAmount
          : scrollAmount,
      behavior: "smooth",
    });
  };

  /*
   * Mouse dragging.
   */
  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    setIsDragging(true);

    setStartX(
      e.pageX -
        container.offsetLeft
    );

    setDragScrollLeft(
      container.scrollLeft
    );

    container.style.cursor =
      "grabbing";
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    const container =
      scrollContainerRef.current;

    if (container) {
      container.style.cursor =
        "grab";
    }
  };

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isDragging) {
      return;
    }

    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    e.preventDefault();

    const x =
      e.pageX -
      container.offsetLeft;

    const walk =
      (x - startX) * 1.5;

    container.scrollLeft =
      dragScrollLeft - walk;
  };

  /*
   * Responsive item sizes.
   */
  const getItemSize = () => {
    const count =
      sortedGroups.length;

    if (count <= 4) {
      return "w-[150px] sm:w-[180px] md:w-[200px]";
    }

    if (count <= 6) {
      return "w-[130px] sm:w-[160px] md:w-[180px]";
    }

    if (count <= 8) {
      return "w-[110px] sm:w-[140px] md:w-[160px]";
    }

    if (count <= 10) {
      return "w-[95px] sm:w-[120px] md:w-[140px]";
    }

    return "w-[85px] sm:w-[100px] md:w-[120px]";
  };

  const getImageSize = () => {
    const count =
      sortedGroups.length;

    if (count <= 4) {
      return "max-w-[180px]";
    }

    if (count <= 6) {
      return "max-w-[160px]";
    }

    if (count <= 8) {
      return "max-w-[140px]";
    }

    if (count <= 10) {
      return "max-w-[120px]";
    }

    return "max-w-[100px]";
  };

  const getTextSize = () => {
    const count =
      sortedGroups.length;

    if (count <= 4) {
      return "text-[12px] sm:text-[14px]";
    }

    if (count <= 6) {
      return "text-[11px] sm:text-[13px]";
    }

    if (count <= 8) {
      return "text-[10px] sm:text-[12px]";
    }

    if (count <= 10) {
      return "text-[9px] sm:text-[11px]";
    }

    return "text-[8px] sm:text-[10px]";
  };

  const getSubtitleSize = () => {
    const count =
      sortedGroups.length;

    if (count <= 4) {
      return "text-[10px] sm:text-[12px]";
    }

    if (count <= 6) {
      return "text-[9px] sm:text-[11px]";
    }

    if (count <= 8) {
      return "text-[8px] sm:text-[10px]";
    }

    if (count <= 10) {
      return "text-[7px] sm:text-[9px]";
    }

    return "text-[6px] sm:text-[8px]";
  };

  const getGapSize = () => {
    const count =
      sortedGroups.length;

    if (count <= 4) {
      return "gap-5 sm:gap-6";
    }

    if (count <= 6) {
      return "gap-4 sm:gap-5";
    }

    if (count <= 8) {
      return "gap-3 sm:gap-4";
    }

    return "gap-2 sm:gap-3";
  };

  const getBadgeSize = () => {
    const count =
      sortedGroups.length;

    if (count <= 4) {
      return "text-[10px] sm:text-[11px] px-2 py-0.5";
    }

    if (count <= 6) {
      return "text-[9px] sm:text-[10px] px-1.5 py-0.5";
    }

    if (count <= 8) {
      return "text-[8px] sm:text-[9px] px-1.5 py-0.5";
    }

    return "text-[7px] sm:text-[8px] px-1 py-0.5";
  };

  const itemSizeClass =
    getItemSize();

  const imageSizeClass =
    getImageSize();

  const textSizeClass =
    getTextSize();

  const subtitleSizeClass =
    getSubtitleSize();

  const gapSizeClass =
    getGapSize();

  const badgeSizeClass =
    getBadgeSize();

  /*
   * Keep hooks above this return.
   */
  if (!hasData) {
    return null;
  }

  return (
    <div className="w-full mb-8 sm:mb-10">
      {/* Header */}
      <div className="w-full mb-3 sm:mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-bold text-[var(--color-ink)]">
          Shop by Age
        </h2>
        <span className="text-[11px] sm:text-sm text-neutral-500 font-medium hidden sm:inline">
          0–24 Months to Teens
        </span>
      </div>

      {/* Navigation */}
      <div className="relative w-full">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            type="button"
            onClick={() =>
              scroll("left")
            }
            className="
              absolute
              left-1
              sm:left-2
              top-1/2
              -translate-y-1/2
              z-20
              bg-white/95
              backdrop-blur-sm
              shadow-lg
              rounded-full
              p-2
              sm:p-3
              hover:bg-white
              transition-all
              duration-200
              border
              border-neutral-200
            "
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-neutral-700" />
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className={`
            flex
            ${gapSizeClass}
            overflow-x-auto
            scrollbar-hide
            snap-x
            snap-mandatory
            cursor-grab
            py-2
            px-0
            touch-pan-x
            select-none
          `}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling:
              "touch",
          }}
          onMouseDown={
            handleMouseDown
          }
          onMouseUp={
            handleMouseUp
          }
          onMouseLeave={
            handleMouseUp
          }
          onMouseMove={
            handleMouseMove
          }
        >
          {sortedGroups.map(
            (ag) => {
              const imageUrl =
                getDisplayImage(
                  ag
                );

              const displayLabel =
                getDisplayLabel(
                  ag
                );

              const subtitle =
                getSubtitleDisplay(
                  ag
                );

              const productCount =
                ag.product_count ?? 0;

              const color =
                getStageColor(
                  ag.stage
                );

              return (
                <Link
                  key={ag.slug}
                  href={`/shop/age/${ag.slug}`}
                  className={`
                    group
                    flex
                    flex-col
                    items-center
                    shrink-0
                    snap-start
                    cursor-grab
                    active:cursor-grabbing
                    ${itemSizeClass}
                  `}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square flex justify-center">
                    <div
                      className={`
                        relative
                        w-full
                        h-full
                        rounded-full
                        overflow-hidden
                        shadow-md
                        hover:shadow-xl
                        transition-all
                        duration-300
                        ${imageSizeClass}
                      `}
                    >
                      {imageUrl ? (
                        <Image
                          src={
                            imageUrl
                          }
                          alt={
                            ag.name
                          }
                          fill
                          sizes="150px"
                          className="
                            object-cover
                            transition-transform
                            duration-300
                            group-hover:scale-110
                          "
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center font-display font-black text-3xl sm:text-4xl text-white ${color.accentBg}`}
                        >
                          {ag.name.charAt(0)}
                        </div>
                      )}

                      {/* Product Count */}
                      {productCount >
                        0 && (
                        <div
                          className={`
                            absolute
                            top-0.5
                            right-0.5
                            ${color.accentBg}
                            text-white
                            font-bold
                            rounded-full
                            shadow-md
                            z-10
                            ${badgeSizeClass}
                          `}
                        >
                          {
                            productCount
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text */}
                  <div className="text-center mt-2 sm:mt-3 w-full">
                    <h4
                      className={`
                        font-bold
                        ${textSizeClass}
                        text-black
                        uppercase
                        tracking-wide
                      `}
                    >
                      {
                        displayLabel
                      }
                    </h4>

                    <p
                      className={`
                        ${subtitleSizeClass}
                        text-black/60
                        font-medium
                        truncate
                        max-w-full
                      `}
                    >
                      {
                        subtitle
                      }
                    </p>
                  </div>
                </Link>
              );
            }
          )}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            type="button"
            onClick={() =>
              scroll("right")
            }
            className="
              absolute
              right-1
              sm:right-2
              top-1/2
              -translate-y-1/2
              z-20
              bg-white/95
              backdrop-blur-sm
              shadow-lg
              rounded-full
              p-2
              sm:p-3
              hover:bg-white
              transition-all
              duration-200
              border
              border-neutral-200
            "
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-neutral-700" />
          </button>
        )}
      </div>
    </div>
  );
}