"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Wishlist } from "@/lib/types";

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api.wishlist().then((r) => setItems(Array.isArray(r) ? r : r.results)).finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="container-shell py-10">
      <h1 className="font-display text-2xl font-black mb-1">My wishlist</h1>
      <p className="text-sm text-neutral-500 mb-6">&nbsp;</p>
      <AccountNav />
      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-500">Nothing saved yet — tap the heart on any product to add it here.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {items.map((w) => (
            <ProductCard key={w.id} product={w.product} />
          ))}
        </div>
      )}
    </main>
  );
}
