import { PRODUCT_GRID } from "@/lib/layout";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type {
  Department,
  ProductListItem,
  AgeGroup,
  Campaign,
  ShowcaseVideoItem,
} from "@/lib/types";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import RecommendedRow from "@/components/RecommendedRow";
import VideoShowcase from "@/components/VideoShowcase";
import PopularNearYou from "@/components/PopularNearYou";

const FALLBACK_IMG = {
  hero: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop",

  baby:
    "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=2070&auto=format&fit=crop",

  kids:
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=2070&auto=format&fit=crop",

  women:
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",

  men:
    "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=2071&auto=format&fit=crop",
};

const FALLBACK_HERO: Campaign[] = [
  {
    id: -1,
    title: "The Kinship Edit",
    description:
      "Minimal outerwear and soft tailoring for the whole family.",
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

type DepartmentWithId = Department & {
  id: number;
};

type DepartmentMedia = {
  id?: number;
  file?: string;
  file_url?: string;
  image?: string;
  image_url?: string;
  media_url?: string;
  url?: string;
  is_primary?: boolean;
  media_type?: string;
};

function resolveMediaUrl(value?: string | null): string {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return mediaUrl(value);
}

function extractDepartmentMediaUrl(
  media: DepartmentMedia | null | undefined
): string {
  if (!media) return "";

  return resolveMediaUrl(
    media.file_url ||
      media.image_url ||
      media.media_url ||
      media.file ||
      media.image ||
      media.url
  );
}

/**
 * Gets the real image attached to a department.
 *
 * Priority:
 *
 * 1. Department primary_image
 * 2. Department media endpoint
 * 3. Exact known backend media files for Baby/Kids
 * 4. AgeGroup image
 * 5. Unsplash fallback
 */
async function getDepartmentImage(
  department: DepartmentWithId | undefined,
  ageGroupFallback?: AgeGroup[]
): Promise<string> {
  if (!department) {
    return FALLBACK_IMG.kids;
  }

  const slug = department.slug.toLowerCase();

  // ------------------------------------------------------------
  // 1. Department primary image
  // ------------------------------------------------------------
  if (department.primary_image?.file_url) {
    const url = resolveMediaUrl(
      department.primary_image.file_url
    );

    if (url) {
      return url;
    }
  }

  // ------------------------------------------------------------
  // 2. Department media endpoint
  // ------------------------------------------------------------
  if (department.id) {
    try {
      const response = await api.departmentMedia(
        department.id
      );

      console.log(
        `[Home] Department media for ${department.name}:`,
        response
      );

      let media: DepartmentMedia[] = [];

      if (Array.isArray(response)) {
        media = response;
      } else if (Array.isArray(response?.results)) {
        media = response.results;
      } else if (Array.isArray(response?.media)) {
        media = response.media;
      } else if (Array.isArray(response?.media_files)) {
        media = response.media_files;
      } else if (Array.isArray(response?.files)) {
        media = response.files;
      }

      if (media.length > 0) {
        const primary =
          media.find(
            (item) => item.is_primary === true
          ) || media[0];

        const url = extractDepartmentMediaUrl(primary);

        if (url) {
          return url;
        }
      }
    } catch (error) {
      console.error(
        `[Home] Failed to load media for ${department.name}:`,
        error
      );
    }
  }

  // ------------------------------------------------------------
  // 3. Exact backend media confirmed from Django admin
  // ------------------------------------------------------------
  if (slug === "baby") {
    return resolveMediaUrl(
      "/media/departments/media/image_72c3f6b1.jpg"
    );
  }

  if (slug === "kids") {
    return resolveMediaUrl(
      "/media/departments/media/download.jpeg"
    );
  }

  // ------------------------------------------------------------
  // 4. AgeGroup image fallback
  // ------------------------------------------------------------
  if (ageGroupFallback && ageGroupFallback.length > 0) {
    const ageImage = ageGroupFallback.find(
      (ageGroup) => ageGroup.primary_image?.file_url
    )?.primary_image?.file_url;

    if (ageImage) {
      return resolveMediaUrl(ageImage);
    }
  }

  // ------------------------------------------------------------
  // 5. Final fallback
  // ------------------------------------------------------------
  return FALLBACK_IMG[slug as keyof typeof FALLBACK_IMG] ||
    FALLBACK_IMG.kids;
}

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
      className="group relative block aspect-[4/5] overflow-hidden lg:aspect-[3/4]"
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/20" />

      <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 text-white lg:pb-12">
        <h3 className="font-editorial text-2xl tracking-wide lg:text-4xl">
          {title}
        </h3>

        {subtitle && (
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] opacity-80">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function Home() {
  let heroCampaigns: Campaign[] = [];
  let departments: DepartmentWithId[] = [];
  let ageGroups: AgeGroup[] = [];
  let products: ProductListItem[] = [];

  // --------------------------------------------------------------
  // HOME DATA
  // --------------------------------------------------------------
  try {
    const home = await api.home();

    heroCampaigns = home.hero_campaigns || [];
    departments = (home.departments || []) as DepartmentWithId[];
    ageGroups = home.age_groups || [];
    const collection = await api.products({ ordering: "-created_at", page_size: "24" }).catch(() => null);
    products = collection?.results?.length ? collection.results : (home.new_arrivals || []);
  } catch {
    const [p, d, a, c] = await Promise.all([
      api
        .products({ ordering: "-created_at", page_size: "24" })
        .catch(() => ({
          results: [] as ProductListItem[],
        })),

      api
        .departments()
        .catch(() => [] as Department[]),

      api
        .ageGroups()
        .catch(() => [] as AgeGroup[]),

      api
        .campaigns()
        .catch(() => ({
          results: [] as Campaign[],
        })),
    ]);

    products = p.results || [];
    departments = (d || []) as DepartmentWithId[];
    ageGroups = a || [];

    heroCampaigns = (c.results || []).filter(
      (campaign) =>
        campaign.placement === "homepage_banner" &&
        campaign.is_live &&
        campaign.image
    );
  }

  // --------------------------------------------------------------
  // WATCH & SHOP VIDEOS
  // --------------------------------------------------------------
  const showcaseVideos: ShowcaseVideoItem[] =
    await api
      .showcaseVideos()
      .then((r) => r.results || [])
      .catch(() => []);

  // --------------------------------------------------------------
  // DEPARTMENTS
  // --------------------------------------------------------------
  const women = departments.find(
    (department) => department.slug === "women"
  );

  const men = departments.find(
    (department) => department.slug === "men"
  );

  const baby = departments.find(
    (department) => department.slug === "baby"
  );

  const kids = departments.find(
    (department) => department.slug === "kids"
  );

  // --------------------------------------------------------------
  // AGE GROUPS
  // --------------------------------------------------------------
  const babyGroups = ageGroups.filter(
    (ageGroup) => ageGroup.stage === "baby"
  );

  const kidsGroups = ageGroups.filter(
    (ageGroup) =>
      ageGroup.stage === "kids" ||
      ageGroup.stage === "teens"
  );

  // --------------------------------------------------------------
  // GET REAL DEPARTMENT IMAGES
  // --------------------------------------------------------------
  const [babyImg, kidsImg, womenImg, menImg] =
    await Promise.all([
      getDepartmentImage(baby, babyGroups),

      getDepartmentImage(kids, kidsGroups),

      getDepartmentImage(
        women,
        []
      ),

      getDepartmentImage(
        men,
        []
      ),
    ]);

  // --------------------------------------------------------------
  // HERO
  // --------------------------------------------------------------
  const slides =
    heroCampaigns.length > 0
      ? heroCampaigns
      : FALLBACK_HERO;

  return (
    <main className="bg-white container-shell font-sans text-black">

      {/* HERO CAROUSEL */}
      <HeroCarousel
        campaigns={slides}
        slideInterval={7000}
      />
 
      {/* FAMILY GRID */}
      <section className=" grid grid-cols-2 gap-2 py-2 lg:py-4 lg:grid-cols-4">

        <CategoryBlock
          href="/shop?stage=baby"
          image={babyImg}
          title="Babies"
          // subtitle="0 – 24 Months"
        />

        <CategoryBlock
          href="/shop?stage=kids"
          image={kidsImg}
          title="Kids"
          // subtitle="2 – 14 Years"
        />

        <CategoryBlock
          href="/shop?department=women"
          image={womenImg}
          title="Women"
        />

        <CategoryBlock
          href="/shop?department=men"
          image={menImg}
          title="Men"
        />

      </section>

      {/* NEW ARRIVALS */}
      {products.length > 0 && (
        <section className="py-2 lg:py-4">

          <div className="mb-4 flex items-end justify-between lg:mb-4">

            <h2 className="font-editorial text-3xl tracking-tight lg:text-5xl">
              New In
            </h2>

            <Link
              href="/shop"
              className="border-b border-transparent pb-0.5 text-[11px] uppercase tracking-[0.15em] text-stone-500 transition hover:border-black hover:text-black"
            >
              View All
            </Link>

          </div>

          <div className={PRODUCT_GRID}>

            {products
              .slice(0, 12)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}

          </div>

        </section>
      )}

      {/* WALK-IN 3D SHOWROOM */}
      <section className="py-7 sm:py-10">
        <Link href="/showroom" className="group relative block min-h-[340px] overflow-hidden bg-[#b9a99a] text-white sm:min-h-[460px]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,15,12,.78)_0%,rgba(20,15,12,.42)_48%,rgba(20,15,12,.08)_100%),url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=85&w=2000&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-1000 group-hover:scale-[1.025]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
          <div className="relative flex min-h-[340px] flex-col justify-end gap-7 px-5 py-9 sm:min-h-[460px] sm:flex-row sm:items-end sm:justify-between sm:px-12 sm:py-12 lg:px-16">
            <div className="max-w-2xl">
              <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/75">LarkTribe · Virtual flagship</p>
              <h2 className="max-w-xl font-editorial text-4xl leading-[1.05] tracking-tight sm:text-6xl">A store you can step into.</h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">Walk the departments, explore pieces on display and pick up a look to inspect it up close.</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-3 self-start border border-white/70 bg-white px-7 py-4 text-[10px] uppercase tracking-[0.2em] text-black transition group-hover:bg-black group-hover:text-white sm:self-auto">Enter the showroom <span aria-hidden>↗</span></span>
          </div>
        </Link>
      </section>

      {/* POPULAR NEAR YOU */}
      <PopularNearYou />

      {/* WATCH & SHOP */}
      <section className="py-2 lg:py-4">
        <VideoShowcase videos={showcaseVideos} />
      </section>

      {/* RECOMMENDED */}
      <section className="py-2 lg:py-4">
        <RecommendedRow
          title="Just For You"
          kind="recommended"
        />
      </section>

      {/* EDITORIAL STATEMENT */}
      <section className="border-stone-200 py-12 text-center sm:py-16">

        <h2 className="mx-auto max-w-2xl font-editorial text-2xl leading-snug tracking-tight lg:text-4xl">
          Designed for modern Larktribe. Made in Kenya,
          worn everywhere.
        </h2>

        <Link
          href="/about"
          className="mt-6 inline-block border-b border-transparent pb-0.5 text-[11px] uppercase tracking-[0.15em] text-stone-500 transition hover:border-black hover:text-black"
        >
          Read Our Story
        </Link>

      </section>

    </main>
  );
}