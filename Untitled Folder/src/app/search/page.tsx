"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    api.smartSearch(q).then((r) => setProducts(r.results || [])).catch(() => setProducts([])).finally(() => setLoading(false));
    api.track("search", { search_query: q });
  }, [q]);

  return (
    <div className="container-shell py-10 min-h-[50vh]">
      <h1 className="font-editorial text-3xl mb-2">Search</h1>
      {q && <p className="text-sm text-stone-500 mb-10">Results for &ldquo;{q}&rdquo;</p>}
      {loading ? (
        <p className="text-stone-400 text-sm">Searching…</p>
      ) : products.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-stone-200">
          <p className="text-stone-600 text-sm">Nothing found{q ? ` for “${q}”` : ""}.</p>
          <Link href="/shop" className="inline-block mt-4 text-[11px] uppercase tracking-widest underline underline-offset-4">Browse All</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-shell py-10 text-stone-400 text-sm">Loading…</div>}>
      <SearchResults />
    </Suspense>
  );
}