"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useGeo } from "@/lib/geo";
import { features } from "@/lib/features-api";
import { PRODUCT_GRID } from "@/lib/layout";
import type { ProductListItem } from "@/lib/types";

/** "Popular in Nairobi" - defaults to Nairobi; switches to the shopper's own city only if they allow location. */
export default function PopularNearYou() {
  const { coords, status, request } = useGeo();
  const [city, setCity] = useState<string>("Nairobi");
  const [items, setItems] = useState<ProductListItem[]>([]);

  useEffect(() => {
    let alive = true;
    const q = coords ? { lat: coords.lat, lng: coords.lng } : { city: "Nairobi" };
    features.popularNear(q).then((r) => {
      if (!alive) return;
      if (r.city) setCity(r.city);
      setItems(r.results);
    }).catch(() => {});
    return () => { alive = false; };
  }, [coords]);

  if (items.length === 0) return null;
  return (
    <section className="container-shell py-6">
      <div className="flex items-end justify-between mb-5">
        <h2 className="text-[13px] tracking-[0.08em] font-editorial ">Popular in {city}</h2>
        {!coords && status !== "denied" && (
          <button onClick={() => request()} className="text-[11px] uppercase tracking-widest text-stone-500 hover:text-black border-b border-transparent hover:border-black pb-0.5">
            Use my location
          </button>
        )}
      </div>
      <div className={PRODUCT_GRID}>
        {items.slice(0, 6).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
