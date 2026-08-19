import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import type { AgeGroup } from "@/lib/types";

export default async function AgeGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [products, ageGroups] = await Promise.all([
    api.products({ age_group: slug }),
    api.ageGroups().catch(() => [] as AgeGroup[]),
  ]);

  const ageGroup = ageGroups.find((g) => g.slug === slug);

  return (
    <main className="container-shell py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          {ageGroup?.icon && <span className="text-3xl">{ageGroup.icon}</span>}
          <h1 className="font-display text-3xl font-black">
            {ageGroup?.name ?? slug.replace(/-/g, " ")}
          </h1>
        </div>
        <p className="text-sm text-neutral-500">{products.count} products</p>
      </div>

      {/* Other age groups, so shoppers can hop between them */}
      {ageGroups.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-6 mb-2 border-b border-[var(--color-line)]">
          {ageGroups.map((g) => (
            <a
              key={g.id}
              href={`/shop/age/${g.slug}`}
              className={`flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold rounded-full px-4 py-2 transition-colors ${
                g.slug === slug
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border border-[var(--color-line)] hover:bg-[#f8e8e8]"
              }`}
            >
              <span>{g.icon}</span>
              <span>{g.name}</span>
            </a>
          ))}
        </div>
      )}

      {products.results.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-neutral-500">No products tagged for this age group yet.</p>
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
