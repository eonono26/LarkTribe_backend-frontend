"use client";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

type Kind = "recommended" | "similar" | "fbt";

export default function RecommendedRow({
  title,
  kind,
  productId,
}: {
  title: string;
  kind: Kind;
  productId?: number;
}) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetcher =
      kind === "recommended"
        ? api.recommendedForYou()
        : kind === "similar" && productId
        ? api.similarProducts(productId)
        : kind === "fbt" && productId
        ? api.frequentlyBoughtTogether(productId)
        : Promise.resolve([]);

    fetcher
      .then((r) => active && setProducts(r))
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, productId]);

  if (loading || products.length === 0) return null;

  return (
    <section className="container-shell mt-14">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">AI powered</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {products.map((p) => (
          <div key={p.id} className="w-40 sm:w-48 shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
