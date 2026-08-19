// app/brands/page.tsx
import Link from "next/link";
import Image from "next/image";
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
              className="group border border-[var(--color-line)] rounded-lg overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all bg-white"
            >
              {/* Brand Image/Logo */}
              <div className="relative h-32 w-full bg-gray-50 flex items-center justify-center p-4">
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
                    <span className="text-4xl font-bold text-gray-400">
                      {b.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Brand Info */}
              <div className="p-4 text-center border-t border-[var(--color-line)]">
                <p className="font-display font-bold truncate text-sm group-hover:text-[#c96e6e] transition-colors">
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
    </main>
  );
}