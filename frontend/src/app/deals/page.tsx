import ProductCard from "@/components/ProductCard";
import { HeroBanner } from "@/components/Banner";
import SaleTiers from "@/components/SaleTiers";
import { api } from "@/lib/api";
import type { Campaign, ProductListItem } from "@/lib/types";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ min_discount?: string }>;
}) {
  const { min_discount } = await searchParams;

  const productParams: Record<string, string> = { on_sale: "true", ordering: "-discount_percent" };
  if (min_discount) productParams.min_discount = min_discount;

  const [productsData, campaignsData] = await Promise.all([
    api.products(productParams).catch(() => ({ results: [] as ProductListItem[], count: 0 })),
    api.campaigns().catch(() => ({ results: [] as Campaign[] })),
  ]);

  const products = productsData.results || [];
  const countdownCampaigns = (campaignsData.results || []).filter((c) => c.style === "countdown" && c.is_live);
  const topDiscount = Math.max(0, ...products.map((p) => p.discount_percent || 0));

  return (
    <main className="pb-10">
      {/* Editorial sale hero — red takeover band, matches the homepage promo strip */}
      <div className="bg-[var(--color-flag)] text-white">
        <div className="container-shell py-8 sm:py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] mb-3">
            Baby · Kids · Women · Men
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight">
            Sale &amp; Promotions
          </h1>
          <p className="text-sm sm:text-base text-white/90 mt-2 max-w-md">
            {products.length} discounted picks across every department
            {topDiscount > 0 ? ` — up to ${topDiscount}% off.` : "."}
          </p>
        </div>
      </div>

      <div className="container-shell mt-6 sm:mt-8">
        <SaleTiers active={min_discount ? parseInt(min_discount, 10) : undefined} />

        {countdownCampaigns.length > 0 && (
          <div className="space-y-4 mb-10">
            {countdownCampaigns.map((c) => (
              <HeroBanner key={c.id} campaign={c} />
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <p className="text-neutral-500">No live deals right now — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
