"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import type { AgeGroup } from "@/lib/types";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GlobalAgeNavProps {
  ageGroups: AgeGroup[];
}

/**
 * Site-wide age strip — sits directly under the main header on every page,
 * the way edgars.co.za pins its age tabs under the nav on collection pages.
 * The pattern is the same; the treatment is LarkTribe's own: a warm ivory
 * "ticket rail" rather than a plain grey tab bar, with stage colour dots
 * (coral/teal/ink — the same coding used deeper on the homepage) and prices
 * set in the same mono face used for receipts elsewhere on the site.
 */
export default function GlobalAgeNav({
  ageGroups = [],
}: GlobalAgeNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const activeStage = searchParams?.get("stage");
  const activeAgeGroup = searchParams?.get("age_group");
  const onShop = pathname === "/shop";

  const STAGE_META: Record<
    string,
    { label: string; dot: string }
  > = {
    baby: { label: "Baby", dot: "bg-[var(--color-accent)]" },
    kids: { label: "Kids", dot: "bg-[var(--color-teal)]" },
    teens: { label: "Teens", dot: "bg-[var(--color-ink)]" },
  };

  const stages: Array<"baby" | "kids" | "teens"> = [
    "baby",
    "kids",
    "teens",
  ];

  const sortedAgeGroups = [...ageGroups]
    .filter(
      (g, i, self) => i === self.findIndex((x) => x.slug === g.slug)
    )
    .sort((a, b) => {
      const order: Record<string, number> = { baby: 0, kids: 1, teens: 2 };
      const sa = order[a.stage ?? "kids"] ?? 1;
      const sb = order[b.stage ?? "kids"] ?? 1;
      if (sa !== sb) return sa - sb;
      return (a.order ?? 0) - (b.order ?? 0);
    });

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft > el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [sortedAgeGroups.length]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (sortedAgeGroups.length === 0) return null;

  // Helper to get primary image URL
  const getPrimaryImageUrl = (ag: AgeGroup): string | null => {
    if (ag.primary_image?.file_url) {
      return ag.primary_image.file_url;
    }
    if (ag.media_files?.length) {
      const primary = ag.media_files.find(m => m.is_primary);
      if (primary?.file_url) return primary.file_url;
      if (ag.media_files[0]?.file_url) return ag.media_files[0].file_url;
    }
    if (ag.media?.length) {
      const primary = ag.media.find(m => m.is_primary);
      if (primary?.file_url) return primary.file_url;
      if (ag.media[0]?.file_url) return ag.media[0].file_url;
    }
    return null;
  };

  return (
    <div className="relative w-full bg-white">
      <div className="container-shell relative">
        {/* Left scroll button - mobile only */}
        <button
          onClick={() => scroll('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-200 ${
            atStart ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-hide py-4 sm:py-5 justify-start sm:justify-center px-2 sm:px-0"
        >
          {/* Specific age ranges — with images on top and name below */}
          {sortedAgeGroups.map((ag) => {
            const meta = STAGE_META[ag.stage ?? "kids"];
            const active = activeAgeGroup === ag.slug;
            const imageUrl = getPrimaryImageUrl(ag);

            return (
              <Link
                key={ag.slug}
                href={`/shop/age/${ag.slug}`}
                className={`shrink-0 flex flex-col items-center gap-2 rounded-xl px-3 py-3 min-w-[90px] sm:min-w-[100px] transition-colors duration-150 bg-white hover:bg-gray-50 ${
                  active
                    ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]"
                    : "text-[var(--color-ink-soft)]"
                }`}
              >
                {/* Image on top - increased size with white background, no hover effects */}
                {imageUrl ? (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden flex-shrink-0 relative bg-white p-1 shadow-sm">
                    <Image
                      src={imageUrl}
                      alt={ag.name}
                      fill
                      className="object-cover rounded-full"
                      sizes="(max-width: 640px) 80px, 96px"
                    />
                  </div>
                ) : (
                  <div
                    className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shadow-sm ${meta?.dot ?? "bg-[var(--color-ink)]"}`}
                  >
                    {ag.icon || ag.name.charAt(0)}
                  </div>
                )}
                
                {/* Name below - increased font size */}
                <span className={`text-xs sm:text-sm font-medium text-center leading-tight ${
                  active ? "text-white" : "text-[var(--color-ink-soft)]"
                }`}>
                  {ag.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right scroll button - mobile only */}
        <button
          onClick={() => scroll('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-200 ${
            atEnd ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Edge fades hint that the rail scrolls, without arrow buttons cluttering every page */}
      <div
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 sm:opacity-0 ${
          atStart ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 sm:opacity-0 ${
          atEnd ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}