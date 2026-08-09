import ProductCard from "@/components/ProductCard";
import Banner from "@/components/Banner";
import { api } from "@/lib/api";
import type { Campaign, ProductListItem } from "@/lib/types";

export default async function DealsPage() {
  const [productsData, campaignsData] = await Promise.all([
    api.products({ on_sale: "true", ordering: "-discount_percent" }).catch(() => ({ results: [] as ProductListItem[], count: 0 })),
    api.campaigns().catch(() => ({ results: [] as Campaign[] })),
  ]);

  const products = productsData.results || [];
  const countdownCampaigns = (campaignsData.results || []).filter((c) => c.style === "countdown" && c.is_live);

  return (
    <main className="container-shell py-10">
      <h1 className="font-display text-3xl font-black mb-1">Today&apos;s deals</h1>
      <p className="text-sm text-neutral-500 mb-8">{products.length} discounted picks across every department.</p>

      {countdownCampaigns.length > 0 && (
        <div className="space-y-4 mb-10">
          {countdownCampaigns.map((c) => (
            <Banner key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-neutral-500">No live deals right now — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
