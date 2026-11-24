"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

const ShowroomExperience = dynamic(() => import("@/components/showroom/ShowroomExperience"), {
  ssr: false,
  loading: () => <div className="h-[70vh] flex items-center justify-center text-sm text-stone-400">Opening the store…</div>,
});

export default function ShowroomPage() {
  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  useEffect(() => {
    // The product list is paginated at 20; pull the first few pages so every zone gets stocked.
    Promise.all([1, 2, 3].map((n) => api.products({ page: String(n) }).then((r) => r.results).catch(() => [] as ProductListItem[])))
      .then((pages) => {
        const seen = new Set<number>();
        setProducts(pages.flat().filter((p) => (seen.has(Number(p.id)) ? false : (seen.add(Number(p.id)), true))));
      });
  }, []);
  if (!products) return <div className="h-[70vh] flex items-center justify-center text-sm text-stone-400">Opening the store…</div>;
  return <ShowroomExperience products={products} />;
}
