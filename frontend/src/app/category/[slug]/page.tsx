import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [products, departments] = await Promise.all([
    api.products({ category__department__slug: slug }),
    api.departments(),
  ]);
  const department = departments.results.find((d) => d.slug === slug);

  return (
    <main className="container-shell py-10">
      <h1 className="font-display text-3xl font-black mb-1">{department?.name ?? slug}</h1>
      <p className="text-sm text-neutral-500 mb-8">{products.count} products</p>

      {products.results.length === 0 ? (
        <p className="text-sm text-neutral-500">No products in this department yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
