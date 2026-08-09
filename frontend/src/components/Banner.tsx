"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import type { Campaign } from "@/lib/types";

const FALLBACK_BG = "var(--color-signal)";

function CountdownClock({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState<number>(new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining <= 0) return <span className="text-xs font-semibold uppercase">Ending soon</span>;

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const cell = (value: number, label: string) => (
    <div className="flex flex-col items-center">
      <span className="font-mono text-xl font-black leading-none">{String(value).padStart(2, "0")}</span>
      <span className="text-[9px] uppercase tracking-widest opacity-70">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      {days > 0 && cell(days, "days")}
      {cell(hours, "hrs")}
      {cell(minutes, "min")}
      {cell(seconds, "sec")}
    </div>
  );
}

function BannerLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  return <Link href={href}>{children}</Link>;
}

/** Generic auto-rotating carousel. Used for the strip row (no arrows/dots, just a slow
 * auto-slide) and the left hero column (arrows + dots, pauses on hover). Renders nothing
 * for 0 slides, and a plain non-interactive slide for exactly 1 (no arrows/dots needed). */
function Carousel({
  slides,
  intervalMs = 6000,
  showArrows = true,
  showDots = true,
  className = "",
}: {
  slides: React.ReactNode[];
  intervalMs?: number;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [slides.length, paused, intervalMs]);

  if (slides.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      setIndex((i) => (i + 1) % slides.length);
    } else if (isRightSwipe) {
      setIndex((i) => (i - 1 + slides.length) % slides.length);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full shrink-0">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && showArrows && (
        <>
          <button
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {slides.length > 1 && showDots && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-[var(--color-ink)]" : "w-1.5 bg-[var(--color-line)]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders one campaign as its configured banner style: hero, strip, split, countdown, or card.
 * `size="half"` shrinks the hero variant for use inside the 2-up split row (noon's side-by-side hero). */
export default function Banner({ campaign, size = "full" }: { campaign: Campaign; size?: "full" | "half" }) {
  const bg = campaign.background_color || FALLBACK_BG;
  const href = campaign.link_url || "/";

  if (campaign.style === "strip") {
    return (
      <BannerLink href={href}>
        <div
          className="w-full rounded-lg overflow-hidden relative min-h-[60px]"
          style={{ backgroundColor: bg }}
        >
          {campaign.image && (
            <div className="relative w-full h-full min-h-[60px]">
              <Image 
                src={mediaUrl(campaign.image)} 
                alt={campaign.title || "Banner"} 
                fill 
                className="object-cover" 
              />
            </div>
          )}
        </div>
      </BannerLink>
    );
  }

  if (campaign.style === "countdown") {
    return (
      <BannerLink href={href}>
        <div
          className="w-full rounded-lg overflow-hidden relative min-h-[120px]"
          style={{ backgroundColor: bg }}
        >
          {campaign.image && (
            <div className="relative w-full h-full min-h-[120px]">
              <Image 
                src={mediaUrl(campaign.image)} 
                alt={campaign.title || "Banner"} 
                fill 
                className="object-cover" 
              />
            </div>
          )}
        </div>
      </BannerLink>
    );
  }

  if (campaign.style === "split") {
    return (
      <BannerLink href={href}>
        <div className="w-full rounded-lg overflow-hidden flex flex-col sm:flex-row" style={{ backgroundColor: bg }}>
          {campaign.image && (
            <div className="relative w-full sm:w-full h-40 sm:h-[200px]">
              <Image src={mediaUrl(campaign.image)} alt={campaign.title || "Banner"} fill className="object-cover" />
            </div>
          )}
        </div>
      </BannerLink>
    );
  }

  if (campaign.style === "card") {
    return (
      <BannerLink href={href}>
        <div
          className="w-full rounded-lg overflow-hidden relative min-h-[140px]"
          style={{ backgroundColor: bg }}
        >
          {campaign.image && (
            <div className="relative w-full h-full min-h-[140px]">
              <Image src={mediaUrl(campaign.image)} alt={campaign.title || "Banner"} fill className="object-cover" />
            </div>
          )}
        </div>
      </BannerLink>
    );
  }

  // Default: hero — shrinks when placed in the split row
  const isHalf = size === "half";
  return (
    <BannerLink href={href}>
      <div
        className={`relative w-full rounded-lg overflow-hidden ${isHalf ? "min-h-[180px] sm:min-h-[220px]" : "min-h-[220px] sm:min-h-[280px]"}`}
        style={{ backgroundColor: bg }}
      >
        {campaign.image && (
          <Image src={mediaUrl(campaign.image)} alt={campaign.title || "Banner"} fill className="object-cover" />
        )}
      </div>
    </BannerLink>
  );
}

/** Fetches live campaigns and renders each in a spot suited to its style:
 * - strip: full-bleed, auto-rotates through multiple live strip campaigns (no arrows/dots)
 * - hero: with 2+ live heroes, splits into a 7/5 row — LEFT column auto-rotates through all but
 *   the last hero (arrows + dots), RIGHT column shows the last hero as a static tile. With exactly
 *   1 live hero, renders full-width with no split/carousel.
 * - split / countdown: full-width, stacked, static
 * - card: packed into a responsive 3-column row, static
 * Renders nothing if no campaigns match. */
export function BannerGroup({
  campaigns,
  placement,
  departmentId,
  styles,
}: {
  campaigns: Campaign[];
  placement: "homepage_banner" | "category_banner";
  departmentId?: number;
  styles?: Campaign["style"][];
}) {
  const matches = campaigns.filter(
    (c) =>
      c.placement === placement &&
      c.is_live &&
      (!departmentId || !c.department || c.department === departmentId) &&
      (!styles || styles.includes(c.style))
  );
  if (matches.length === 0) return null;

  const strips = matches.filter((c) => c.style === "strip");
  const heroes = matches.filter((c) => c.style === "hero");
  const splits = matches.filter((c) => c.style === "split");
  const countdowns = matches.filter((c) => c.style === "countdown");
  const cards = matches.filter((c) => c.style === "card");

  const stripSlides = strips.map((c) => <Banner key={c.id} campaign={c} />);

  const rightHero = heroes.length >= 2 ? heroes[heroes.length - 1] : null;
  const leftHeroes = rightHero ? heroes.slice(0, -1) : heroes;

  return (
    <div className="space-y-4">
      {stripSlides.length > 0 && (
        <div className="container-shell">
          <Carousel 
            slides={stripSlides} 
            intervalMs={4000} 
            showArrows={true}  // Changed to true to show arrows
            showDots={false}
          />
        </div>
      )}

      {heroes.length === 1 && (
        <div className="container-shell">
          <Banner campaign={heroes[0]} size="full" />
        </div>
      )}

      {heroes.length >= 2 && (
        <div className="container-shell grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <Carousel
              slides={leftHeroes.map((c) => (
                <Banner key={c.id} campaign={c} size="half" />
              ))}
            />
          </div>
          <div className="md:col-span-5">
            <Banner campaign={rightHero!} size="half" />
          </div>
        </div>
      )}

      {[...splits, ...countdowns].map((c) => (
        <div key={c.id} className="container-shell">
          <Banner campaign={c} />
        </div>
      ))}

      {cards.length > 0 && (
        <div className="container-shell grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Banner key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}