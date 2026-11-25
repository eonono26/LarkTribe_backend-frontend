"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
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

  const goTo = useCallback((next: number) => {
    if (count === 0) return;
    setIndex(((next % count) + count) % count);
  }, [count]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (isPaused || count <= 1) return;
    const timer = window.setInterval(goNext, slideInterval);
    return () => window.clearInterval(timer);
  }, [goNext, isPaused, slideInterval, count]);

  if (count === 0) return null;

  return (
    <section
      className="group relative w-full overflow-hidden bg-black"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
        setIsPaused(true);
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX.current;
        if (delta > 40) goPrev();
        if (delta < -40) goNext();
        touchStartX.current = null;
        setIsPaused(false);
      }}
    >
      <div className="relative h-[88svh] min-h-[520px] w-full overflow-hidden lg:h-[100svh]">
        {slides.map((campaign, i) => {
          const isActive = i === activeIndex;
          const imageSrc = campaign.image ? mediaUrl(campaign.image) : "";
          return (
            <article
              key={campaign.id || i}
              className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${isActive ? "z-10 pointer-events-auto opacity-100" : "pointer-events-none z-0 opacity-0"}`}
              aria-hidden={!isActive}
            >
              <Link
                href={campaign.link_url || "#"}
                aria-label={campaign.title || "Shop this collection"}
                tabIndex={isActive ? 0 : -1}
                className="relative block h-full w-full overflow-hidden"
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={campaign.title || ""}
                    draggable={false}
                    className={`absolute inset-0 h-full w-full select-none object-cover object-center transition-transform duration-[9000ms] ease-out ${isActive ? "scale-[1.07]" : "scale-100"}`}
                  />
                ) : (
                  <div className="absolute inset-0" style={{ backgroundColor: campaign.background_color || "#0A0A0A" }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                <div className="absolute bottom-10 left-5 right-5 text-white sm:left-8 lg:bottom-14 lg:left-12">
                  {campaign.title && (
                    <h2 className="max-w-2xl text-[22px] leading-tight tracking-[0.06em] sm:text-[34px] lg:text-[44px]">{campaign.title}</h2>
                  )}
                  {campaign.description && (
                    <p className="mt-3 max-w-md text-[12px] uppercase tracking-[0.06em] opacity-85">{campaign.description}</p>
                  )}
                  <span className="mt-5 inline-block zara-link">{campaign.cta_label || "Shop now"}</span>
                </div>
              </Link>
            </article>
          );
        })}

        {count > 1 && (
          <div className="absolute bottom-4 right-5 z-20 flex gap-1.5 sm:right-8 lg:right-12">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-[2px] w-8 transition-colors ${i === activeIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
