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
import Tilt3DShowcase from "@/components/Tilt3DShowcase";
import Reveal from "@/components/Reveal";
import Tilt from "@/components/Tilt";

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

async function getDepartmentImage(
  department: DepartmentWithId | undefined,
  ageGroupFallback?: AgeGroup[]
): Promise<string> {
  if (!department) {
    return FALLBACK_IMG.kids;
  }

  const slug = department.slug.toLowerCase();

  if (department.primary_image?.file_url) {
    const url = resolveMediaUrl(
      department.primary_image.file_url
    );

    if (url) {
      return url;
    }
  }

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

  if (ageGroupFallback && ageGroupFallback.length > 0) {
    const ageImage = ageGroupFallback.find(
      (ageGroup) => ageGroup.primary_image?.file_url
    )?.primary_image?.file_url;

    if (ageImage) {
      return resolveMediaUrl(ageImage);
    }
  }

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
    <Link href={href} className="group block min-w-0">
      <Tilt max={3}>
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100 lg:aspect-[4/5]">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="tilt-layer absolute bottom-5 left-5 right-5 text-white">
            <h3 className="text-[13px] tracking-[0.08em]">{title}</h3>
            {subtitle && <p className="mt-1 text-[11px] tracking-[0.06em] uppercase opacity-80">{subtitle}</p>}
            <span className="mt-3 inline-block zara-link">Shop now</span>
          </div>
        </div>
      </Tilt>
    </Link>
  );
}

export default async function Home() {
  let heroCampaigns: Campaign[] = [];
  let departments: DepartmentWithId[] = [];
  let ageGroups: AgeGroup[] = [];
  let products: ProductListItem[] = [];

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

  const showcaseVideos: ShowcaseVideoItem[] =
    await api
      .showcaseVideos()
      .then((r) => r.results || [])
      .catch(() => []);

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

  const babyGroups = ageGroups.filter(
    (ageGroup) => ageGroup.stage === "baby"
  );

  const kidsGroups = ageGroups.filter(
    (ageGroup) =>
      ageGroup.stage === "kids" ||
      ageGroup.stage === "teens"
  );

  const [babyImg, kidsImg, womenImg, menImg] =
    await Promise.all([
      getDepartmentImage(baby, babyGroups),
      getDepartmentImage(kids, kidsGroups),
      getDepartmentImage(women, []),
      getDepartmentImage(men, []),
    ]);

  const slides =
    heroCampaigns.length > 0
      ? heroCampaigns
      : FALLBACK_HERO;

  return (
    <main className="bg-white font-sans text-black">
      {/* Full-bleed hero, runs under the transparent header */}
      <HeroCarousel campaigns={slides} slideInterval={7000} />

      {/* Four departments, edge to edge */}
      <section className="grid grid-cols-2 gap-[2px] lg:grid-cols-4">
        <CategoryBlock href="/shop?stage=baby" image={babyImg} title="Babies" subtitle="0 – 24 months" />
        <CategoryBlock href="/shop?stage=kids" image={kidsImg} title="Kids" subtitle="2 – 8 yrs & up" />
        <CategoryBlock href="/shop?department=women" image={womenImg} title="Women" subtitle="Activewear" />
        <CategoryBlock href="/shop?department=men" image={menImg} title="Men" subtitle="Shorts" />
      </section>

      {products.length > 0 && (
        <Reveal>
          <section className="pt-14 lg:pt-20">
            <div className="mb-5 flex items-end justify-between px-4 sm:px-6 lg:px-8">
              <h2 className="text-[13px] tracking-[0.08em]">New in</h2>
              <Link href="/shop" className="zara-link">View all</Link>
            </div>
            <div className={PRODUCT_GRID}>
              {products.slice(0, 12).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {products.length >= 4 && (
        <Reveal>
          <section className="pt-14 lg:pt-20 px-4 sm:px-6 lg:px-8">
            <Tilt3DShowcase products={products} />
          </section>
        </Reveal>
      )}

      {/* 3D virtual flagship */}
      <Reveal>
        <section className="pt-14 lg:pt-20">
          <Link href="/showroom" className="group relative block h-[78svh] min-h-[480px] overflow-hidden bg-stone-900 text-white">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=85&w=2400&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[1600ms] group-hover:scale-[1.04]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
            <div className="absolute bottom-8 left-5 right-5 sm:left-8 lg:left-12 lg:bottom-12">
              <p className="zara-label opacity-80">LarkTribe · 3D store</p>
              <h2 className="mt-3 max-w-xl text-[22px] leading-tight tracking-[0.04em] sm:text-[30px]">Walk into the store</h2>
              <span className="mt-5 inline-block zara-link">Enter</span>
            </div>
          </Link>
        </section>
      </Reveal>

      <Reveal>
        <div className="pt-14 lg:pt-20"><PopularNearYou /></div>
      </Reveal>

      <Reveal>
        <section className="pt-14 lg:pt-20">
          <VideoShowcase videos={showcaseVideos} />
        </section>
      </Reveal>

      <Reveal>
        <section className="pt-14 lg:pt-20">
          <RecommendedRow title="Just for you" kind="recommended" />
        </section>
      </Reveal>

      <section className="px-4 py-20 text-center">
        <p className="mx-auto max-w-xl text-[13px] leading-relaxed tracking-[0.06em] uppercase">
          Designed for the modern family. Made in Kenya, worn everywhere.
        </p>
        <Link href="/about" className="mt-6 inline-block zara-link">Our story</Link>
      </section>
    </main>
  );
}
