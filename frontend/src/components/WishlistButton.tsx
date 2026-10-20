"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Wishlist } from "@/lib/types";

export default function WishlistButton({ productId, size = 20 }: { productId: number | string; size?: number }) {
  const [wishlistItemId, setWishlistItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    api.wishlist().then((r) => {
      const items = Array.isArray(r) ? r : r.results;
      const match = (items as Wishlist[]).find((w) => w.product.id === productId);
      if (match) setWishlistItemId(match.id);
    }).catch(() => {});
  }, [productId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      if (wishlistItemId) {
        await api.removeFromWishlist(wishlistItemId);
        setWishlistItemId(null);
        window.dispatchEvent(new Event("larktribe:wishlist-updated"));
      } else {
        const item = await api.addToWishlist(productId);
        setWishlistItemId(item.id);
        api.track("wishlist_add", { product: productId });
        window.dispatchEvent(new Event("larktribe:wishlist-updated"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      aria-label="Toggle wishlist"
      onClick={toggle}
      disabled={loading}
      className="hover:opacity-70 disabled:opacity-40"
    >
      <Heart size={size} className={wishlistItemId ? "fill-[var(--color-flag)] text-[var(--color-flag)]" : ""} />
    </button>
  );
}
