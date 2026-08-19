import Link from "next/link";
import Image from "next/image"; // Add this import
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import RecommendedRow from "@/components/RecommendedRow";
import { BannerGroup } from "@/components/Banner";
import DepartmentCarousel from "@/components/DepartmentCarousel";
import AgeGroupNav from "@/components/AgeGroupNav";
import VideoShowcase from "@/components/VideoShowcase";
import { Smartphone, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import type { Brand, Campaign, Department, ProductListItem, ShowcaseVideoItem, AgeGroup } from "@/lib/types";

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
  const [productsData, campaignsData, departmentsData, recommendedData, dealsData, brandsData, showcaseVideoData, ageGroupsResult] = await Promise.all([
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
    api.ageGroups().catch((err) => {
      console.error("Failed to fetch age groups:", err);
      return [] as AgeGroup[];
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
  const ageGroupsData = ageGroupsResult || [];

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
      <section className="container-shell mt-3">
        <DepartmentCarousel 
          departments={deptData}
          colors={DEPT_COLORS}
          labels={DEPT_LABELS}
        />
      </section>

      {/* Shop by age — Baby, Kids, Teens, etc. */}
      <section className="container-shell mt-3">
        <AgeGroupNav ageGroups={ageGroupsData} />
      </section>

      {/* Trust badges strip */}
      <section className="container-shell mt-3">
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
        <section className="container-shell mt-3">
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
      <section className="container-shell mt-3">
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
     {/* Top brands strip */}
{brands.length > 0 && (
  <section className="container-shell mt-3">
    <div className="flex items-baseline justify-between mb-5">
      <h2 className="font-display text-2xl font-bold">Top brands</h2>
      {/* <Link href="/brands" className="text-sm font-semibold underline">View all</Link> */}
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {brands.map((b: Brand) => (
        <Link
          key={b.id}
          href={`/brand/${b.id}`}
          className="group relative border border-[var(--color-line)] rounded-lg overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all bg-white aspect-square"
        >
          {/* Brand Image/Logo - Covers the whole card */}
          <div className="absolute inset-0 w-full h-full">
            {b.primary_image ? (
              <Image
                src={b.primary_image.file_url}
                alt={b.primary_image.alt_text || b.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 33vw, 16vw"
              />
            ) : b.logo_url ? (
              <Image
                src={b.logo_url}
                alt={b.name}
                fill
                className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 33vw, 16vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <span className="text-6xl font-bold text-gray-300">
                  {b.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Brand Info - Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="font-display font-bold text-sm text-white truncate">
                {b.name}
              </p>
              <p className="text-[10px] text-white/80">
                {b.product_count} item{b.product_count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </section>
)}

      {/* Newsletter / app promo banner */}
<section className="container-shell mt-8">
  <div className="rounded-xl bg-gradient-to-r from-[#c96e6e] via-[#d4787a] to-[#e8a0a0] text-white px-6 py-10 sm:px-12 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-black mb-2 flex items-center gap-2">
        Never miss a deal
        <span className="text-2xl">✨</span>
      </h2>
      <p className="text-sm text-white/90 max-w-md">
        Get notified about new drops, flash sales, and vendor arrivals — right from your account notifications.
      </p>
    </div>
    <Link
      href="/account/notifications"
      className="bg-white text-[#c96e6e] font-semibold uppercase text-sm tracking-wide px-6 py-3 rounded-full shrink-0 hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-md"
    >
      Manage notifications
    </Link>
  </div>
</section>
    </main>
  );
}