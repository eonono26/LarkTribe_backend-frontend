"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { apiErrorMessage } from "@/lib/api";

export default function AddToCartButton({
  productId,
  inStock,
  variantId,
  quantity = 1,
  fullWidth = false,
  requiresSelection = false,
  showError = true,
}: {
  productId: number | string;
  inStock: boolean;
  // Resolved ProductVariant id matching the shopper's chosen color/size.
  // Passed through to the cart so the color/size survives to checkout.
  variantId?: number | string | null;
  quantity?: number;
  fullWidth?: boolean;
  // True when the product has variants but the shopper hasn't picked a
  // color/size combination that resolves to one yet — disables the
  // button with a clearer label instead of silently ignoring the pick.
  requiresSelection?: boolean;
  // The mobile sticky bar has no room for a message line.
  showError?: boolean;
}) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !inStock || loading || requiresSelection;

  return (
    <div className={fullWidth ? "w-full" : "w-full md:w-auto"}>
      <button
        disabled={disabled}
        onClick={async () => {
          if (disabled) return;
          setLoading(true);
          setError(null);
          try {
            await addItem(productId, quantity, variantId ?? null);
          } catch (e) {
            setError(apiErrorMessage(e, "Couldn't add this to your bag. Please try again."));
          } finally {
            setLoading(false);
          }
        }}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-espresso text-stone-50 hover:bg-stone-950 disabled:opacity-40 text-xs uppercase tracking-widest font-semibold transition-opacity font-sans"
      >
        {!inStock
          ? "Out of stock"
          : loading
          ? "Adding…"
          : requiresSelection
          ? "Select options"
          : "Add to bag"}
      </button>
      {showError && error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
