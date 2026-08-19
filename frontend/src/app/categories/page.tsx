import { api } from "@/lib/api";
import CategoryCard from "@/components/CategoryCard";
import type { Category } from "@/lib/types";

export default async function CategoriesPage() {
  const categoriesData = await api.categories({ page_size: "100" }).catch(() => ({ results: [] as Category[], count: 0 }));
  const categories = categoriesData.results || [];

  // Group by department so the page reads like a catalogue rather than one flat grid.
  const byDepartment = new Map<string, { name: string; categories: Category[] }>();
  for (const cat of categories) {
    const key = cat.department?.slug || "other";
    if (!byDepartment.has(key)) byDepartment.set(key, { name: cat.department?.name || "Other", categories: [] });
    byDepartment.get(key)!.categories.push(cat);
  }

  return (
    <main className="container-shell py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black mb-1">Shop by category</h1>
        {/* <p className="text-sm text-neutral-500">{categories.length} categories</p> */}
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-neutral-500">No categories yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {[...byDepartment.entries()].map(([slug, group]) => (
            <section key={slug}>
              <h2 className="font-display text-xl font-bold mb-4">{group.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {group.categories.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
