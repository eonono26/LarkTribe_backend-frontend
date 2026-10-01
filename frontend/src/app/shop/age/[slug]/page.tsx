import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import type { AgeGroup } from "@/lib/types";

const GENDER_LABEL: Record<string, string> = {
  girls: "Girls",
  boys: "Boys",
  unisex: "Unisex",
};

export default async function AgeGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { slug } = await params;
  const filters = await searchParams;

  // AgeGroup is age-only — gender is a separate Product filter, so it's
  // read from the query string here rather than off the age group itself.
  const productParams: Record<string, string> = { age: slug };
  if (filters.gender) productParams.gender = filters.gender;
  if (filters.category) productParams.category = filters.category;

  const [products, ageGroups] = await Promise.all([
    api.products(productParams),
    api.ageGroups().catch(() => [] as AgeGroup[]),
  ]);

  const ageGroup = ageGroups.find((g) => g.slug === slug);

  return (
    <main className="container-shell py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-3xl font-black">
            {ageGroup?.name ?? slug.replace(/-/g, " ")}
          </h1>
        </div>
        <p className="text-sm text-neutral-500">{products.count} products</p>
      </div>

      {/* Gender — Baby Boys / Baby Girls is a Product.gender filter, not a
          separate category or age group */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-line)]">
        {(["girls", "boys", "unisex"] as const).map((gender) => {
          const isActive = filters.gender === gender;
          return (
            <a
              key={gender}
              href={`?gender=${gender}`}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                isActive
                  ? "border-[var(--color-ink)] text-[var(--color-ink)]"
                  : "border-transparent text-neutral-500 hover:text-[var(--color-ink)]"
              }`}
            >
              {GENDER_LABEL[gender]}
            </a>
          );
        })}
        {filters.gender && (
          <a
            href="?"
            className="px-5 py-2.5 text-sm font-semibold text-neutral-400 hover:text-neutral-600"
          >
            All
          </a>
        )}
      </div>

      {/* Other age groups, so shoppers can hop between them */}
      {ageGroups.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-6 mb-2 border-b border-[var(--color-line)]">
          {ageGroups.map((g) => (
            <a
              key={g.id}
              href={`/shop/age/${g.slug}${filters.gender ? `?gender=${filters.gender}` : ""}`}
              className={`flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold rounded-full px-4 py-2 transition-colors ${
                g.slug === slug
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border border-[var(--color-line)] hover:bg-[var(--color-mist)]"
              }`}
            >
              <span>{g.name}</span>
            </a>
          ))}
        </div>
      )}

      {products.results.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-mist)] rounded-2xl">
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
