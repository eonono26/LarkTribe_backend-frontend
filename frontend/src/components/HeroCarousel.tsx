"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Campaign } from "@/lib/types";

export default function HeroCarousel({
  campaigns,
  slideInterval = 7000,
}: {
  campaigns?: Campaign[];
  slideInterval?: number;
}) {
  const slides = campaigns ?? [];

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;

      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const goNext = useCallback(() => {
    goTo(index + 1);
  }, [goTo, index]);

  const goPrev = useCallback(() => {
    goTo(index - 1);
  }, [goTo, index]);

  useEffect(() => {
    if (isPaused || count <= 1) return;

    const timer = setInterval(goNext, slideInterval);

    return () => clearInterval(timer);
  }, [goNext, isPaused, slideInterval, count]);

  if (count === 0) return null;

  return (
    <section
      className="
        relative
        w-full
        overflow-hidden
        bg-stone-950

        /* Mobile */
        h-[220px]

        /* Tablet */
        sm:h-[340px]

        /* Desktop */
        lg:h-[460px]
      "
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        setIsPaused(true);
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;

        const delta =
          e.changedTouches[0].clientX - touchStartX.current;

        if (delta > 40) {
          goPrev();
        } else if (delta < -40) {
          goNext();
        }

        touchStartX.current = null;
        setIsPaused(false);
      }}
    >
      {/* Slides */}
      <div className="absolute inset-0 w-full h-full">
        {slides.map((campaign, i) => {
          const isActive = i === index;

          return (
            <article
              key={campaign.id}
              className={`
                absolute
                inset-0
                w-full
                h-full
                transition-opacity
                duration-700
                ease-in-out
                ${
                  isActive
                    ? "z-10 opacity-100 pointer-events-auto"
                    : "z-0 opacity-0 pointer-events-none"
                }
              `}
              aria-hidden={!isActive}
            >
              {/* The whole slide is just an image, linking straight to the campaign — no text overlay. */}
              <Link
                href={campaign.link_url || "#"}
                aria-label={campaign.title || "Shop this collection"}
                className="absolute inset-0 block w-full h-full"
                tabIndex={isActive ? 0 : -1}
              >
                {campaign.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={campaign.image}
                    alt={campaign.title || ""}
                    className={`
                      absolute
                      inset-0
                      block
                      w-full
                      h-full
                      max-w-none
                      object-cover
                      object-center
                      transition-transform
                      duration-[7000ms]
                      ease-out
                      ${
                        isActive
                          ? "scale-105"
                          : "scale-100"
                      }
                    `}
                  />
                ) : (
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backgroundColor:
                        campaign.background_color || "#0c0a09",
                    }}
                  />
                )}
              </Link>
            </article>
          );
        })}
      </div>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {slides.map((campaign, i) => (
            <button
              key={campaign.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}

      {/* Arrow navigation only */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={goPrev}
            className="
              hidden sm:flex
              absolute
              left-4
              lg:left-6
              top-1/2
              -translate-y-1/2
              z-20
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-white/10
              backdrop-blur-md
              border
              border-white/25
              text-white
              hover:bg-white/20
              transition
            "
          >
            <ChevronLeft
              className="w-5 h-5"
              strokeWidth={1.6}
            />
          </button>

          <button
            type="button"
            aria-label="Next slide"
            onClick={goNext}
            className="
              hidden sm:flex
              absolute
              right-4
              lg:right-6
              top-1/2
              -translate-y-1/2
              z-20
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-white/10
              backdrop-blur-md
              border
              border-white/25
              text-white
              hover:bg-white/20
              transition
            "
          >
            <ChevronRight
              className="w-5 h-5"
              strokeWidth={1.6}
            />
          </button>
        </>
      )}
    </section>
  );
}