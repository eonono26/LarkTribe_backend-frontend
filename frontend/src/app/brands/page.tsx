import Link from "next/link";
import { api } from "@/lib/api";
import type { Brand } from "@/lib/types";

export default async function BrandsPage() {
  const data = await api.brands({ has_products: "true" }).catch(() => ({ results: [] as Brand[], count: 0 }));
  const brands = data.results || [];

  return (
    <main className="container-shell py-12">
      <h1 className="font-display text-3xl font-black mb-2">Brands</h1>
      <p className="text-sm text-neutral-500 mb-8">Browse everything by brand, from established names to LarkTribe favorites.</p>

      {brands.length === 0 ? (
        <p className="text-sm text-neutral-500">No brands to show yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {brands.map((b: Brand) => (
            <Link
              key={b.id}
              href={`/brand/${b.id}`}
              className="border border-[var(--color-line)] rounded-lg p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <p className="font-display font-bold truncate">{b.name}</p>
              <p className="text-xs text-neutral-500 mt-1">{b.product_count} product{b.product_count === 1 ? "" : "s"}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
