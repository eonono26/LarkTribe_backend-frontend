"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [usedQuery, setUsedQuery] = useState(q);
  const [corrected, setCorrected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api.track("search", { search_query: q });
    api
      .smartSearch(q)
      .then((r) => {
        setResults(r.results);
        setUsedQuery(r.used_query);
        setCorrected(r.corrected);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <main className="container-shell py-10">
      <h1 className="font-display text-2xl font-black mb-2">Results for &ldquo;{q}&rdquo;</h1>
      {corrected && (
        <p className="text-sm text-neutral-500 mb-6">
          Showing results for <span className="font-semibold">{usedQuery}</span> (smart search corrected your spelling).
        </p>
      )}
      {loading ? (
        <p className="text-neutral-400">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-neutral-500">No products matched your search. Try different keywords, or ask our chat assistant.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="container-shell py-10 text-neutral-400">Loading…</main>}>
      <SearchResults />
    </Suspense>
  );
}
