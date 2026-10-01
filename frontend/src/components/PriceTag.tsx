"use client";

import { useLocalization } from "@/lib/localization-context";

export default function PriceTag({
  price,
  compareAtPrice,
  size = "md",
}: {
  price: string | number;
  compareAtPrice?: string | number | null;
  size?: "sm" | "md" | "lg";
}) {
  const { formatPrice } = useLocalization();

  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  const numericCompare =
    compareAtPrice != null
      ? typeof compareAtPrice === "string"
        ? parseFloat(compareAtPrice)
        : compareAtPrice
      : null;
  const hasDiscount = numericCompare != null && numericCompare > numericPrice;
  const pctOff = hasDiscount ? Math.round(((numericCompare! - numericPrice) / numericCompare!) * 100) : 0;

  const priceSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-2xl";
  const compareSize = size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className="inline-flex items-baseline flex-wrap gap-x-2 gap-y-1">
      <span className={`price ${priceSize} font-bold text-[var(--color-ink)]`}>{formatPrice(price)}</span>
      {compareAtPrice ? (
        <span className={`price ${compareSize} text-neutral-400 line-through`}>{formatPrice(compareAtPrice)}</span>
      ) : null}
      {hasDiscount && (
        <span className="price text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent-dark)]">
          -{pctOff}%
        </span>
      )}
    </span>
  );
}
