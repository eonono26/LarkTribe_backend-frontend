import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { BannerGroup } from "@/components/Banner";
import MediaGallery from "@/components/MediaGallery";
import type { Campaign, Department } from "@/lib/types";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const [products, departments, campaigns] = await Promise.all([
    api.products({ category__department__slug: slug }),
    api.departments(),
    api.campaigns().catch(() => ({ results: [] as Campaign[] })),
  ]);

  // departments is an array directly, not an object with results
  const department = departments.find((d: Department) => d.slug === slug);

  return (
    <main className="container-shell py-10">
      {department && (
        <div className="mb-8">
          <BannerGroup campaigns={campaigns.results} placement="category_banner" departmentId={department.id} />
        </div>
      )}

      {/* Department Header with Media Gallery */}
      {department && (
        <div className="mb-8">
          <MediaGallery 
            media={department.media_files || []} 
            className="rounded-xl overflow-hidden"
          />
          
          <div className="mt-4">
            <h1 className="font-display text-3xl font-black mb-1">{department.name}</h1>
            {department.description && (
              <p className="text-neutral-600 mb-2">{department.description}</p>
            )}
            <div className="flex gap-4 text-sm text-neutral-500">
              <span>{products.count} products</span>
              {department.category_count > 0 && (
                <span>{department.category_count} categories</span>
              )}
              {department.images?.length > 0 && (
                <span>📷 {department.images.length} images</span>
              )}
              {department.videos?.length > 0 && (
                <span>🎬 {department.videos.length} videos</span>
              )}
            </div>
          </div>
        </div>
      )}

      {!department && (
        <div className="mb-8">
          <h1 className="font-display text-3xl font-black mb-1 capitalize">{slug.replace(/-/g, ' ')}</h1>
          <p className="text-sm text-neutral-500 mb-8">{products.count} products</p>
        </div>
      )}

      {products.results.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-neutral-500">No products in this department yet.</p>
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