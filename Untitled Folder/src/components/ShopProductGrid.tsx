"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import type { ProductListItem } from "@/lib/types";

export default function ShopProductGrid({ initialProducts, totalCount, productParams }: {
  initialProducts: ProductListItem[];
  totalCount: number;
  productParams: Record<string, string>;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasMore = products.length < totalCount;

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const data = await api.products({ ...productParams, page: String(next) });
      setProducts(prev => [...prev, ...(data.results || [])]);
      setPage(next);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (products.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-16 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-10 py-3 border border-black text-[11px] uppercase tracking-widest font-medium hover:bg-black hover:text-white transition disabled:opacity-40"
          >
            {loading ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </>
  );
}