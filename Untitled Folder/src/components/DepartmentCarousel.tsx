// DepartmentCarousel.tsx
'use client';

import DepartmentCard from './DepartmentCard';
import type { Department } from '@/lib/types';

interface DepartmentCarouselProps {
  departments?: Department[];
  colors?: Record<string, string>;
  labels?: Record<string, string>;
}

/**
 * "Shop by Department" — a clean, responsive grid instead of a scroll
 * carousel. Grids reflow naturally at every breakpoint (2 cols on phones,
 * 3 on tablets, up to 5 on desktop) so mobile never shows a single
 * oversized card — no drag/auto-scroll JS needed.
 */
export default function DepartmentCarousel({
  departments = [],
  colors = {},
  labels = {},
}: DepartmentCarouselProps) {
  if (!departments || departments.length === 0) {
    return (
      <div className="py-6 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Browse</span>
          <h2 className="font-display text-xl sm:text-3xl font-semibold text-[var(--color-ink)] mt-1">
            Shop by Department
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl bg-[var(--color-mist)] aspect-[4/5] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Browse</span>
        <h2 className="font-display text-xl sm:text-3xl font-semibold text-[var(--color-ink)] mt-1">
          Shop by Department
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
        {departments.map((dept, index) => {
          const color = colors?.[dept.slug as keyof typeof colors] || '#9CA3AF';
          const label = labels?.[dept.slug as keyof typeof labels] || dept.name;

          return (
            <DepartmentCard
              key={dept.slug || index}
              department={dept}
              color={color}
              label={label}
            />
          );
        })}
      </div>
    </div>
  );
}
