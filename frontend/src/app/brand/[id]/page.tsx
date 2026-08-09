import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await api.brandProducts(Number(id)).catch(() => null);

  if (!data) {
    return (
      <main className="container-shell py-12">
        <p className="text-neutral-500">This brand couldn&apos;t be found.</p>
      </main>
    );
  }

  return (
    <main className="container-shell py-10">
      <h1 className="font-display text-3xl font-black mb-1">{data.brand.name}</h1>
      <p className="text-sm text-neutral-500 mb-8">{data.count} product{data.count === 1 ? "" : "s"}</p>

      {data.products.length === 0 ? (
        <p className="text-neutral-500">No products from this brand yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.products.map((p: ProductListItem) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
