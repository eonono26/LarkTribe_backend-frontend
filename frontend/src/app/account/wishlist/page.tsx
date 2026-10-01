"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EditorialProductCard from "@/components/EditorialProductCard";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { useCart } from "@/lib/cart-context";
import { useLocalization } from "@/lib/localization-context";
import type { Wishlist } from "@/lib/types";

export default function WishlistPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const { formatPrice } = useLocalization();
  const [items, setItems] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [movingAll, setMovingAll] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api.wishlist().then((r) => setItems(Array.isArray(r) ? r : r.results)).finally(() => setLoading(false));
  }, [router]);

  const sorted = [...items].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return sort === "newest" ? diff : -diff;
  });

  const totalValue = items.reduce((sum, w) => sum + parseFloat(w.product?.price || "0"), 0);

  async function moveAllToBag() {
    if (movingAll) return;
    setMovingAll(true);
    try {
      for (const w of items) {
        await addItem(w.product.id, 1);
      }
      router.push("/cart");
    } finally {
      setMovingAll(false);
    }
  }

  return (
    <main className="bg-stone-50 text-espresso pt-20 font-sans min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold block mb-1">Saved Curations</span>
            <h1 className="font-editorial text-3xl sm:text-4xl text-espresso">
              My Wishlist {items.length > 0 && <span className="text-stone-400 text-xl">({items.length})</span>}
            </h1>
          </div>
          {items.length > 0 && (
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
              className="appearance-none bg-stone-100 hover:bg-stone-200 text-espresso text-xs uppercase tracking-wider py-2 pl-3 pr-6 rounded-full focus:outline-none cursor-pointer transition-colors self-start"
            >
              <option value="newest">Newest Saved</option>
              <option value="oldest">Oldest Saved</option>
            </select>
          )}
        </div>

        <AccountNav />

        {loading ? (
          <p className="text-stone-400 mt-8">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-300 max-w-lg mt-8">
            <p className="text-stone-600 font-medium">Nothing saved yet</p>
            <p className="text-sm text-stone-400 mt-1 mb-5">Tap the heart on any product to add it here.</p>
            <Link
              href="/shop"
              className="inline-flex px-6 py-2.5 bg-espresso text-stone-50 hover:bg-stone-900 text-xs uppercase tracking-widest font-semibold rounded-lg transition"
            >
              Browse The Shop
            </Link>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 text-stone-100 rounded-2xl px-6 py-5 mt-8 mb-10">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">Pieces Saved</p>
                  <p className="font-editorial text-xl mt-0.5">{items.length}</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">Combined Value</p>
                  <p className="font-editorial text-xl mt-0.5">{formatPrice(totalValue)}</p>
                </div>
              </div>
              <button
                onClick={moveAllToBag}
                disabled={movingAll}
                className="px-6 py-3 bg-white text-stone-900 hover:bg-stone-200 text-xs uppercase tracking-widest font-semibold rounded-lg transition disabled:opacity-60 whitespace-nowrap"
              >
                {movingAll ? "Moving…" : "Move All To Bag"}
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200">
              <span className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold">All Saved Pieces</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {sorted.map((w) => (
                <div key={w.id} className="space-y-2">
                  <EditorialProductCard product={w.product} />
                  <button
                    onClick={async () => {
                      await api.removeFromWishlist(w.id);
                      setItems((prev) => prev.filter((x) => x.id !== w.id));
                    }}
                    className="w-full text-center text-[11px] uppercase tracking-widest text-stone-400 hover:text-espresso transition"
                  >
                    Remove from Wishlist
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
