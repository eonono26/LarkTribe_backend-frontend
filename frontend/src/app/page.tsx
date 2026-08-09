import Link from "next/link";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import RecommendedRow from "@/components/RecommendedRow";
import { BannerGroup } from "@/components/Banner";
import DepartmentCarousel from "@/components/DepartmentCarousel";
import VideoShowcase from "@/components/VideoShowcase";
import { Smartphone, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import type { Brand, Campaign, Department, ProductListItem, ShowcaseVideoItem } from "@/lib/types";

// Fallback colors for departments if image is not available
const DEPT_COLORS = {
  women: "var(--dept-women)",
  kids: "var(--dept-kids)",
  beauty: "var(--dept-beauty)",
  maternity: "var(--dept-maternity)",
  "home-lifestyle": "var(--dept-home)",
};

const DEPT_LABELS = {
  women: "Women",
  kids: "Kids",
  beauty: "Beauty",
  maternity: "Maternity",
  "home-lifestyle": "Home & Lifestyle",
};

export default async function Home() {
  // Fetch data with better error handling
  const [productsData, campaignsData, departmentsData, recommendedData, dealsData, brandsData, showcaseVideoData] = await Promise.all([
    api.products({ ordering: "-created_at" }).catch((err) => {
      console.error("Failed to fetch products:", err);
      return { results: [], count: 0 };
    }),
    api.campaigns().catch((err) => {
      console.error("Failed to fetch campaigns:", err);
      return { results: [] as Campaign[] };
    }),
    api.departments().catch((err) => {
      console.error("Failed to fetch departments:", err);
      return [] as Department[];
    }),
    api.recommendedForYou().catch((err) => {
      console.error("Failed to fetch recommended:", err);
      return [] as ProductListItem[];
    }),
    api.products({ on_sale: "true", ordering: "-discount_percent" }).catch((err) => {
      console.error("Failed to fetch deals:", err);
      return { results: [] as ProductListItem[], count: 0 };
    }),
    api.brands({ has_products: "true" }).catch((err) => {
      console.error("Failed to fetch brands:", err);
      return { results: [] as Brand[], count: 0 };
    }),
    api.showcaseVideos().catch((err) => {
      console.error("Failed to fetch showcase videos:", err);
      return { results: [] as ShowcaseVideoItem[], count: 0 };
    }),
  ]);

  // Extract data from responses
  const products = productsData?.results || [];
  const campaigns = campaignsData?.results || [];
  const departments = departmentsData || [];
  const recommended = recommendedData || [];
  const deals = (dealsData?.results || []).slice(0, 10);
  const brands = (brandsData?.results || []).slice(0, 12);
  const showcaseVideos = showcaseVideoData?.results || [];

  // If departments are not available from API, use fallback
  const deptData = departments.length > 0 ? departments : 
    Object.entries(DEPT_LABELS).map(([slug, name]) => ({
      id: 0,
      name,
      slug,
      order: 0,
      description: null,
      is_active: true,
      media_files: [],
      primary_image: null,
      images: [],
      videos: [],
      category_count: 0,
      product_count: 0,
      created_at: "",
      updated_at: "",
    }));

  // Debug logging (remove in production)
  console.log("Products fetched:", products.length);
  console.log("First product:", products[0]);

  return (
    <main>
      {/* Promo strip — sits right under the header */}
      <BannerGroup campaigns={campaigns} placement="homepage_banner" styles={["strip"]} />

      {/* Campaign banners */}
      <div className="mt-4 md:mt-6">
        <BannerGroup
          campaigns={campaigns}
          placement="homepage_banner"
          styles={["hero", "split", "countdown", "card"]}
        />
      </div>

      {/* Department Carousel - Horizontal scrolling with auto-scroll */}
      <section className="container-shell mt-8">
        <DepartmentCarousel 
          departments={deptData}
          colors={DEPT_COLORS}
          labels={DEPT_LABELS}
        />
      </section>

      {/* Trust badges strip */}
      <section className="container-shell mt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--color-mist)] rounded-xl p-5">
          <div className="flex items-center gap-2.5">
            <Smartphone size={20} className="shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">Pay with M-Pesa</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Truck size={20} className="shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">Fast Kenya-wide delivery</span>
          </div>
          <div className="flex items-center gap-2.5">
            <RotateCcw size={20} className="shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">7-day easy returns</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">Verified vendors</span>
          </div>
        </div>
      </section>

      {/* Today's deals */}
      {deals.length > 0 && (
        <section className="container-shell mt-14">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-2xl font-bold">
              Today&apos;s deals <span className="text-[var(--color-flag)]">🔥</span>
            </h2>
            <Link href="/deals" className="text-sm font-semibold underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {deals.map((p: ProductListItem) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Just landed products */}
      <section className="container-shell mt-14">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-2xl font-bold">Just landed</h2>
          <Link href="/category/women" className="text-sm font-semibold underline">View all</Link>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">
              No products yet — run <code className="bg-[var(--color-mist)] px-1 py-0.5 rounded">python manage.py seed_demo</code> on
              the backend, or add products from the vendor dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((p: ProductListItem) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Shoppable video showcase — dedicated video content, own upload */}
      <VideoShowcase videos={showcaseVideos} />

      {/* Recommended products - only show if there are products */}
      {recommended.length > 0 && (
        <RecommendedRow 
          title="Recommended for you" 
          kind="recommended"
          products={recommended}
        />
      )}

      {/* Top brands strip */}
      {brands.length > 0 && (
        <section className="container-shell mt-14">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-2xl font-bold">Top brands</h2>
            <Link href="/brands" className="text-sm font-semibold underline">View all</Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {brands.map((b: Brand) => (
              <Link
                key={b.id}
                href={`/brand/${b.id}`}
                className="border border-[var(--color-line)] rounded-lg py-5 px-3 text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <p className="font-display font-bold text-sm truncate">{b.name}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">{b.product_count} items</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter / app promo banner */}
      <section className="container-shell mt-16">
        <div className="rounded-xl bg-[var(--color-ink)] text-white px-6 py-10 sm:px-12 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-2">Never miss a deal</h2>
            <p className="text-sm text-neutral-300 max-w-md">
              Get notified about new drops, flash sales, and vendor arrivals — right from your account notifications.
            </p>
          </div>
          <Link
            href="/account/notifications"
            className="bg-[var(--color-signal)] text-[var(--color-ink)] font-semibold uppercase text-sm tracking-wide px-6 py-3 rounded-full shrink-0 hover:opacity-90"
          >
            Manage notifications
          </Link>
        </div>
      </section>
    </main>
  );
}