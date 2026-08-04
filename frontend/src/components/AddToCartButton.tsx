"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";

export default function AddToCartButton({ productId, inStock }: { productId: number; inStock: boolean }) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={!inStock || loading}
      onClick={async () => {
        setLoading(true);
        await addItem(productId, 1);
        setLoading(false);
      }}
      className="w-full md:w-auto bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide px-8 py-3.5 rounded-full disabled:opacity-40"
    >
      {inStock ? (loading ? "Adding…" : "Add to bag") : "Out of stock"}
    </button>
  );
}
