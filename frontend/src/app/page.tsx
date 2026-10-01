import Link from "next/link";
import { api } from "@/lib/api";
import type { Department, ProductListItem, AgeGroup, Campaign, ShowcaseVideoItem } from "@/lib/types";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import RecommendedRow from "@/components/RecommendedRow";
import VideoShowcase from "@/components/VideoShowcase";

const FALLBACK_IMG = {
  hero: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop",
  baby: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=2070&auto=format&fit=crop",
  kids: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=2070&auto=format&fit=crop",
  women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
  men: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=2071&auto=format&fit=crop",
};

const FALLBACK_HERO: Campaign[] = [
  {
    id: -1,
    title: "The Kinship Edit",
    description: "Minimal outerwear and soft tailoring for the whole family.",
    placement: "homepage_banner",
    style: "hero",
    background_color: "#0A0A0A",
    cta_label: "Explore",
    image: FALLBACK_IMG.hero,
    link_url: "/shop",
    department: null,
    coupon: null,
    is_ai_generated: false,
    active: true,
    starts_at: new Date().toISOString(),
    ends_at: null,
    is_live: true,
    created_at: new Date().toISOString(),
  },
];

function CategoryBlock({
  href,
  image,
  title,
  subtitle,
}: {
  href: string;
  image: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden aspect-[4/5] lg:aspect-[3/4]"
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition" />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 lg:pb-12 text-white">
        <h3 className="font-editorial text-2xl lg:text-4xl tracking-wide">
          {title}
        </h3>

        {subtitle && (
          <p className="text-[11px] tracking-[0.2em] uppercase mt-2 opacity-80">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function Home() {
  // Use the new consolidated endpoint if available, else fall back to parallel calls
  let heroCampaigns: Campaign[] = [];
  let departments: Department[] = [];
  let ageGroups: AgeGroup[] = [];
  let products: ProductListItem[] = [];

  try {
    const home = await api.home();

    heroCampaigns = home.hero_campaigns || [];
    departments = home.departments || [];
    ageGroups = home.age_groups || [];
    products = home.new_arrivals || [];
  } catch {
    const [p, d, a, c] = await Promise.all([
      api
        .products({ ordering: "-created_at" })
        .catch(() => ({ results: [] as ProductListItem[] })),

      api
        .departments()
        .catch(() => [] as Department[]),

      api
        .ageGroups()
        .catch(() => [] as AgeGroup[]),

      api
        .campaigns()
        .catch(() => ({ results: [] as Campaign[] })),
    ]);

    products = p.results || [];
    departments = d || [];
    ageGroups = a || [];

    heroCampaigns = (c.results || []).filter(
      (c) =>
        c.placement === "homepage_banner" &&
        c.is_live &&
        c.image
    );
  }

  // Shoppable "Watch & shop" videos — never let a failure here break the homepage
  const showcaseVideos: ShowcaseVideoItem[] = await api
    .showcaseVideos()
    .then((r) => r.results || [])
    .catch(() => []);

  const women = departments.find((d) => d.slug === "women");
  const men = departments.find((d) => d.slug === "men");

  const babyGroups = ageGroups.filter(
    (a) => a.stage === "baby"
  );

  const kidsGroups = ageGroups.filter(
    (a) => a.stage === "kids" || a.stage === "teens"
  );

  const babyImg =
    babyGroups.find((a) => a.primary_image)?.primary_image?.file_url ||
    FALLBACK_IMG.baby;

  const kidsImg =
    kidsGroups.find((a) => a.primary_image)?.primary_image?.file_url ||
    FALLBACK_IMG.kids;

  const slides =
    heroCampaigns.length > 0
      ? heroCampaigns
      : FALLBACK_HERO;

  return (
    <main className="bg-white text-black font-sans pt-16 lg:pt-20">
      {/* HERO CAROUSEL */}
      <HeroCarousel
        campaigns={slides}
        slideInterval={7000}
      />

      {/* FAMILY GRID — 4 massive blocks, edge-to-edge on mobile, 2×2 on desktop */}
      <section className="grid grid-cols-2 gap-4 pt-4 container-shell  lg:grid-cols-4">
        <CategoryBlock
          href="/shop?stage=baby"
          image={babyImg}
          title="Baby"
          subtitle="0 – 24 Months"
        />

        <CategoryBlock
          href="/shop?stage=kids"
          image={kidsImg}
          title="Kids"
          subtitle="2 – 14 Years"
        />

        <CategoryBlock
          href="/shop?department=women"
          image={
            women?.primary_image?.file_url ||
            FALLBACK_IMG.women
          }
          title="Women"
        />

        <CategoryBlock
          href="/shop?department=men"
          image={
            men?.primary_image?.file_url ||
            FALLBACK_IMG.men
          }
          title="Men"
        />
      </section>

      {/* NEW ARRIVALS — sparse, no badges, editorial spacing */}
      {products.length > 0 && (
        <section className="py-8 lg:py-16 container-shell">
          <div className="flex items-end justify-between mb-10 lg:mb-14">
            <h2 className="font-editorial text-3xl lg:text-5xl tracking-tight">
              New In
            </h2>

            <Link
              href="/shop"
              className="text-[11px] tracking-[0.15em] uppercase text-stone-500 hover:text-black transition border-b border-transparent hover:border-black pb-0.5"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 lg:gap-x-6">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* WATCH & SHOP — shoppable videos, right after New In */}
      <section className="py-8 lg:py-12 container-shell">
      <VideoShowcase videos={showcaseVideos} />
      </section>

      {/* RECOMMENDED FOR YOU — personalized picks from the AI recommendation engine */}

      <section className="container-shell py-8 lg:py-12">
         <RecommendedRow title="Just For You" kind="recommended" />
      </section>
     

      {/* EDITORIAL STATEMENT — thin strip, lots of whitespace */}
      <section className="border-t border-stone-200 py-20 lg:py-28 text-center container-shell">
        <h2 className="font-editorial text-2xl lg:text-4xl tracking-tight max-w-2xl mx-auto leading-snug">
          Designed for modern kinship. Made in Kenya, worn everywhere.
        </h2>

        <Link
          href="/about"
          className="inline-block mt-6 text-[11px] tracking-[0.15em] uppercase text-stone-500 hover:text-black transition border-b border-transparent hover:border-black pb-0.5"
        >
          Read Our Story
        </Link>
      </section>
    </main>
  );
}