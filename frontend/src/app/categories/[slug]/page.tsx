import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import MediaGallery from "@/components/MediaGallery";
import type { Category } from "@/lib/types";

export default async function CategoryProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [products, categoriesData] = await Promise.all([
    api.products({ category: slug, ordering: "-created_at" }),
    api.categories({ page_size: "100" }).catch(() => ({ results: [] as Category[], count: 0 })),
  ]);

  const category = categoriesData.results?.find((c) => c.slug === slug) || null;

  return (
    <main className="container-shell py-10">
      {category && category.media_files?.length > 0 && (
        <div className="mb-8">
          <MediaGallery media={category.media_files} className="rounded-xl overflow-hidden" />
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-display text-3xl font-black mb-1">
          {category?.name || slug.replace(/-/g, " ")}
        </h1>
        {category?.description && <p className="text-neutral-600 mb-2">{category.description}</p>}
        <div className="flex gap-4 text-sm text-neutral-500">
          <span>{products.count} products</span>
          {category?.department && <span>in {category.department.name}</span>}
        </div>
      </div>

      {products.results.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-neutral-500">No products in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
