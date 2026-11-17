"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/api";
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
  const activeIndex = count > 0 && index >= count ? 0 : index;

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

  /*
   * ---------------------------------------------------------
   * AUTO SLIDE
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (isPaused || count <= 1) return;

    const timer = window.setInterval(() => {
      goNext();
    }, slideInterval);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    goNext,
    isPaused,
    slideInterval,
    count,
  ]);

  if (count === 0) {
    return null;
  }

  return (
    <section
      className="
        relative
        w-full
        overflow-hidden
        bg-white
        container-shell
      "
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current =
          event.touches[0].clientX;

        setIsPaused(true);
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) {
          return;
        }

        const delta =
          event.changedTouches[0].clientX -
          touchStartX.current;

        if (delta > 40) {
          goPrev();
        }

        if (delta < -40) {
          goNext();
        }

        touchStartX.current = null;
        setIsPaused(false);
      }}
    >
      {/* =====================================================
          HERO IMAGE AREA

          The hero has ONE consistent aspect ratio.
          This prevents a shorter image from exposing
          the section background underneath it.
          ===================================================== */}
      <div
        className="
          relative
          w-full
          aspect-[16/6]
          sm:aspect-[16/6]
          md:aspect-[16/6]
          lg:aspect-[16/6]
          xl:aspect-[16/6]
          overflow-hidden
        "
      >
        {slides.map((campaign, i) => {
          const isActive = i === activeIndex;

          const imageSrc = campaign.image
            ? mediaUrl(campaign.image)
            : "";

          return (
            <article
              key={campaign.id || i}
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
              <Link
                href={campaign.link_url || "#"}
                aria-label={
                  campaign.title ||
                  "Shop this collection"
                }
                tabIndex={isActive ? 0 : -1}
                className="
                  relative
                  block
                  w-full
                  h-full
                  overflow-hidden
                "
              >
                {imageSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imageSrc}
                    alt={campaign.title || ""}
                    draggable={false}
                    className={`
                      absolute
                      inset-0

                      w-full
                      h-full

                      min-w-full
                      min-h-full

                      object-cover
                      object-center

                      select-none

                      transition-transform
                      ease-out
                      duration-[7000ms]

                      ${
                        isActive
                          ? "scale-105"
                          : "scale-100"
                      }
                    `}
                  />
                ) : (
                  <div
                    className="absolute inset-0 h-full w-full"
                    style={{
                      backgroundColor:
                        campaign.background_color ||
                        "#ffffff",
                    }}
                  />
                )}
              </Link>
            </article>
          );
        })}

        {/* =================================================
            LEFT ARROW
            ================================================= */}
        {count > 1 && (
          <button
            type="button"
            aria-label="Previous slide"
            onClick={goPrev}
            className="
              absolute
              left-2
              sm:left-4
              lg:left-6

              top-1/2
              -translate-y-1/2

              z-30

              flex
              h-9
              w-9
              sm:h-10
              sm:w-10
              lg:h-11
              lg:w-11

              items-center
              justify-center

              rounded-full

              bg-black/30
              backdrop-blur-md

              border
              border-white/30

              text-white

              shadow-lg

              transition-all
              duration-200

              hover:bg-black/50
              hover:scale-105

              active:scale-95
            "
          >
            <ChevronLeft
              className="h-5 w-5 lg:h-6 lg:w-6"
              strokeWidth={1.8}
            />
          </button>
        )}

        {/* =================================================
            RIGHT ARROW
            ================================================= */}
        {count > 1 && (
          <button
            type="button"
            aria-label="Next slide"
            onClick={goNext}
            className="
              absolute
              right-2
              sm:right-4
              lg:right-6

              top-1/2
              -translate-y-1/2

              z-30

              flex
              h-9
              w-9
              sm:h-10
              sm:w-10
              lg:h-11
              lg:w-11

              items-center
              justify-center

              rounded-full

              bg-black/30
              backdrop-blur-md

              border
              border-white/30

              text-white

              shadow-lg

              transition-all
              duration-200

              hover:bg-black/50
              hover:scale-105

              active:scale-95
            "
          >
            <ChevronRight
              className="h-5 w-5 lg:h-6 lg:w-6"
              strokeWidth={1.8}
            />
          </button>
        )}
      </div>
    </section>
  );
}