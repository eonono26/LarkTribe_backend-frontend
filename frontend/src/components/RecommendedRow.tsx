// components/RecommendedRow.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import type { ProductListItem } from "@/lib/types";
import { api } from "@/lib/api";

interface RecommendedRowProps {
  title: string;
  kind: "similar" | "fbt" | "recommended";
  productId?: number | string;
  products?: ProductListItem[];
}

export default function RecommendedRow({
  title,
  kind,
  productId,
  products: initialProducts,
}: RecommendedRowProps) {
  const [products, setProducts] = useState<ProductListItem[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProducts() {
      if (kind !== "recommended" && !productId) {
        setLoading(false);
        return;
      }

      try {
        let data: ProductListItem[] | undefined;
        if (kind === "recommended") {
          data = await api.recommendedForYou();
        } else if (kind === "similar" && productId != null) {
          data = await api.similarProducts(productId);
        } else if (kind === "fbt" && productId != null) {
          data = await api.frequentlyBoughtTogether(productId);
        }

        if (cancelled) return;
        setProducts(data || []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error(`Failed to fetch ${kind} products:`, err);
        setError("Failed to load recommendations");
        setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [kind, productId, initialProducts]);

  if (loading) {
    return (
      <section className="container-shell py-8 lg:py-12">
        <h2 className="font-editorial text-2xl lg:text-3xl tracking-tight mb-8">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-10">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-stone-100 aspect-square" />
              <div className="h-3 bg-stone-100 mt-3 w-2/3" />
              <div className="h-3 bg-stone-100 mt-2 w-1/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 lg:py-12">
      <div className="flex items-end justify-between mb-8 lg:mb-10">
        <h2 className="font-editorial text-5xl lg:text-5xl tracking-tight">{title}</h2>
        <Link
          href="/shop"
          className="text-[11px] tracking-[0.15em] uppercase text-stone-500 hover:text-black transition border-b border-transparent hover:border-black pb-0.5"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
        {products.slice(0, 10).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
