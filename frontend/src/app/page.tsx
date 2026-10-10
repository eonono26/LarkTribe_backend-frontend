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
    products = home.new_arrivals || [];
  } catch {
    const [p, d, a, c] = await Promise.all([
      api
        .products({ ordering: "-created_at" })
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
    <main className="bg-white container-shell pt-16 font-sans text-black lg:pt-20">

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
          title="Baby"
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

            <h2 className="font-editorial text-3xl pl-2 tracking-tight lg:text-5xl">
              New In
            </h2>

            <Link
              href="/shop"
              className="border-b border-transparent pb-0.5 text-[11px] uppercase tracking-[0.15em] text-stone-500 transition hover:border-black hover:text-black"
            >
              View All
            </Link>

          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-2 lg:grid-cols-3 lg:gap-x-2">

            {products
              .slice(0, 9)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}

          </div>

        </section>
      )}

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
      <section className="container-shell border-stone-200 text-center">

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