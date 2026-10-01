import type { ProductImage, ProductVariant } from "./types";

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL"];

function sizeRank(size: string): number {
  const idx = SIZE_ORDER.indexOf(size.toUpperCase());
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}

function compareSizes(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  const ra = sizeRank(a);
  const rb = sizeRank(b);
  if (ra !== rb) return ra - rb;
  return 0; // keep vendor-entered order for anything else
}

const same = (a: string | undefined | null, b: string | undefined | null) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

/** Distinct colors, in the order the vendor created them. */
export function colorsOf(variants: ProductVariant[]): string[] {
  return [...new Set(variants.map((v) => v.color).filter(Boolean))];
}

/** Total units in stock for a color (all sizes). */
export function colorStock(variants: ProductVariant[], color: string): number {
  return variants.filter((v) => same(v.color, color)).reduce((n, v) => n + (v.stock || 0), 0);
}

export interface SizeOption {
  size: string;
  stock: number;
  inStock: boolean;
}

/**
 * Sizes offered for ONE color, each with its own stock. Sizes that exist but
 * are sold out in this color are still returned (inStock=false) so the UI can
 * cross them out instead of silently hiding them.
 */
export function sizesForColor(variants: ProductVariant[], color: string | null): SizeOption[] {
  const pool = color ? variants.filter((v) => same(v.color, color)) : variants;
  const stockBySize = new Map<string, number>();

  for (const v of pool) {
    if (!v.size) continue;
    stockBySize.set(v.size, (stockBySize.get(v.size) || 0) + (v.stock || 0));
  }

  return [...stockBySize.entries()]
    .map(([size, stock]) => ({ size, stock, inStock: stock > 0 }))
    .sort((a, b) => compareSizes(a.size, b.size));
}

/** The exact variant for the shopper's color + size pick (or undefined). */
export function findVariant(
  variants: ProductVariant[],
  color: string | null,
  size: string | null
): ProductVariant | undefined {
  const hasColors = colorsOf(variants).length > 0;
  const forColor = hasColors ? variants.filter((v) => same(v.color, color)) : variants;
  const hasSizes = forColor.some((v) => v.size);

  if (hasSizes) {
    return forColor.find((v) => v.size === size);
  }
  return forColor[0];
}

/** Which color to open on: requested one if valid, else first in-stock, else first. */
export function initialColor(variants: ProductVariant[], requested?: string | null): string | null {
  const colors = colorsOf(variants);
  if (colors.length === 0) return null;
  if (requested) {
    const match = colors.find((c) => same(c, requested));
    if (match) return match;
  }
  return colors.find((c) => colorStock(variants, c) > 0) ?? colors[0];
}

/** Best size to preselect for a color: keep the current one if still available. */
export function pickSize(
  variants: ProductVariant[],
  color: string | null,
  current: string | null
): string | null {
  const options = sizesForColor(variants, color);
  if (options.length === 0) return null;
  const keep = options.find((o) => o.size === current && o.inStock);
  return (keep ?? options.find((o) => o.inStock) ?? options[0]).size;
}

/**
 * Photos to show for a color: that color's own shots first, then any general
 * (untagged) shots. If the vendor hasn't tagged a photo for this color yet,
 * fall back to every photo so the gallery is never empty.
 */
export function imagesForColor<T extends Pick<ProductImage, "color">>(
  images: T[],
  color: string | null
): T[] {
  if (!color) return images;
  const tagged = images.filter((i) => same(i.color, color));
  if (tagged.length === 0) return images;
  const general = images.filter((i) => !i.color);
  return [...tagged, ...general];
}
