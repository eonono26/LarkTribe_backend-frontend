import Link from "next/link";
import { api } from "@/lib/api";
import type { Department } from "@/lib/types";

const FALLBACK: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
  men: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=2071&auto=format&fit=crop",
  baby: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=2070&auto=format&fit=crop",
  kids: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=2070&auto=format&fit=crop",
};

export default async function CategoriesPage() {
  const departments = await api.departments().catch(() => [] as Department[]);

  return (
    <main className="bg-white text-black font-sans min-h-screen">
      <div className="container-shell py-12">
        <h1 className="font-editorial text-4xl mb-10">Collections</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((d: Department) => (
            <Link key={d.slug} href={`/shop?department=${d.slug}`} className="group relative block overflow-hidden aspect-[3/4]">
              <img src={d.primary_image?.file_url || FALLBACK[d.slug] || FALLBACK.kids} alt={d.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition" />
              <div className="absolute inset-0 flex items-end justify-center pb-8 text-white">
                <h2 className="font-editorial text-2xl tracking-wide">{d.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}