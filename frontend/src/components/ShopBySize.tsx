import Link from "next/link";

// Mirrors SIZE_OPTIONS in FilterSidebar.tsx — 2T-4T covers the toddler
// crossover, XS-XL covers older kids/teens (9-20 yrs) who are past the
// "Shop by Age" tiles and shop by size instead, Rookie-USA-style.
const SIZES = ["2T", "3T", "4T", "XS", "S", "M", "L", "XL"];

export default function ShopBySize() {
  return (
    <div className="w-full">
      <div className="w-full mb-3 sm:mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-bold text-[var(--color-ink)]">
          Shop by Size
        </h2>
        <span className="text-[11px] sm:text-sm text-neutral-500 font-medium hidden sm:inline">
          Older kids &amp; teens
        </span>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {SIZES.map((s) => (
          <Link
            key={s}
            href={`/shop?size=${encodeURIComponent(s)}`}
            className="flex items-center justify-center min-w-[52px] sm:min-w-[60px] px-4 py-2.5 sm:py-3 rounded-full border border-[var(--color-line)] bg-white font-bold text-sm sm:text-base text-[var(--color-ink)] hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors shadow-sm"
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}
