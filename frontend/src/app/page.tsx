import Link from "next/link";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import RecommendedRow from "@/components/RecommendedRow";

const DEPT_TILES = [
  { slug: "women", label: "Women", color: "var(--dept-women)" },
  { slug: "kids", label: "Kids", color: "var(--dept-kids)" },
  { slug: "beauty", label: "Beauty", color: "var(--dept-beauty)" },
  { slug: "maternity", label: "Maternity", color: "var(--dept-maternity)" },
  { slug: "home-lifestyle", label: "Home & Lifestyle", color: "var(--dept-home)" },
];

export default async function Home() {
  const products = await api.products({ ordering: "-created_at" }).catch(() => ({ results: [], count: 0 } as const));

  return (
    <main>
      <section className="bg-[var(--color-signal)]">
        <div className="container-shell py-14 md:py-20">
          <p className="font-display uppercase tracking-widest text-xs font-bold mb-3">Nairobi · Kenya-wide delivery</p>
          <h1 className="font-display text-4xl md:text-6xl font-black leading-[0.95] max-w-2xl">
            Everything for her, the kids, and home — from vendors you can trust.
          </h1>
          <p className="mt-4 max-w-md text-sm md:text-base">
            One marketplace. Hundreds of independent Kenyan sellers. Pay with M-Pesa, card, or cash on delivery.
          </p>
          <Link
            href="/category/women"
            className="inline-block mt-6 bg-[var(--color-ink)] text-white font-semibold text-sm uppercase tracking-wide px-6 py-3 rounded-full"
          >
            Start shopping
          </Link>
        </div>
      </section>

      <section className="container-shell -mt-8 md:-mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {DEPT_TILES.map((d) => (
            <Link
              key={d.slug}
              href={`/category/${d.slug}`}
              className="bg-white border border-[var(--color-line)] rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <div className="h-2 w-8 mx-auto rounded-full mb-3" style={{ background: d.color }} />
              <span className="text-sm font-semibold">{d.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-shell mt-14">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-2xl font-bold">Just landed</h2>
          <Link href="/category/women" className="text-sm font-semibold underline">View all</Link>
        </div>
        {products.results.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No products yet — run <code className="bg-[var(--color-mist)] px-1 py-0.5 rounded">python manage.py seed_demo</code> on
            the backend, or add products from the vendor dashboard.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <RecommendedRow title="Recommended for you" kind="recommended" />
    </main>
  );
}
