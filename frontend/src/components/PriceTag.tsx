"use client";

import { useLocalization } from "@/lib/localization-context";

export default function PriceTag({
  price,
  compareAtPrice,
}: {
  price: string | number;
  compareAtPrice?: string | number | null;
}) {
  const { formatPrice } = useLocalization();
  return (
    <>
      <span className="text-2xl font-bold">{formatPrice(price)}</span>
      {compareAtPrice ? (
        <span className="text-neutral-400 line-through">{formatPrice(compareAtPrice)}</span>
      ) : null}
    </>
  );
}
