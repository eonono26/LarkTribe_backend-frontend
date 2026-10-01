// app/brands/page.tsx
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import type { Brand } from "@/lib/types";

export default async function BrandsPage() {
  const data = await api.brands({ has_products: "true" }).catch(() => ({ results: [] as Brand[], count: 0 }));
  const brands = data.results || [];

  return (
    <main className="pb-12">
      {/* Editorial header band — consistent with the sale/deals page treatment */}
      <div className="bg-[var(--color-ink)] text-white">
        <div className="container-shell py-8 sm:py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] mb-3">
            Shop by brand
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight">Brands</h1>
          <p className="text-sm sm:text-base text-white/80 mt-2 max-w-md">
            {brands.length} brand{brands.length === 1 ? "" : "s"} for baby, kids, women & men, from established names to LarkTribe favorites.
          </p>
        </div>
      </div>

      <div className="container-shell mt-6 sm:mt-8">
      {brands.length === 0 ? (
        <p className="text-sm text-neutral-500">No brands to show yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {brands.map((b: Brand) => (
            <Link
              key={b.id}
              href={`/brand/${b.id}`}
              className="group border border-[var(--color-line)] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white"
            >
              {/* Brand Image/Logo */}
              <div className="relative h-32 w-full bg-[var(--color-mist)] flex items-center justify-center p-4">
                {b.primary_image ? (
                  <Image
                    src={b.primary_image.file_url}
                    alt={b.primary_image.alt_text || b.name}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                ) : b.logo_url ? (
                  <Image
                    src={b.logo_url}
                    alt={b.name}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-4xl font-bold text-neutral-400">
                      {b.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Brand Info */}
              <div className="p-4 text-center border-t border-[var(--color-line)]">
                <p className="font-display font-bold truncate text-sm group-hover:text-[var(--color-accent)] transition-colors">
                  {b.name}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {b.product_count} product{b.product_count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}