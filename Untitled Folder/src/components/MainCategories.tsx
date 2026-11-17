import Link from "next/link";
import Image from "next/image";
import type { AgeGroup, Category, Department } from "@/lib/types";

export default function MainCategories({
  ageGroups = [],
  categories = [],
  departments = [],
}: {
  ageGroups?: AgeGroup[];
  categories?: Category[];
  departments?: Department[];
}) {
  // Baby → the single 0-24 Months age group
  const babyGroup = ageGroups
    .filter((g) => g.stage === "baby")
    .sort((a, b) => (a.min_age_years ?? 0) - (b.min_age_years ?? 0))[0];

  // Kids → any kids-stage age group
  const kidsGroup = ageGroups.find((g) => g.stage === "kids");

  function departmentTileImage(deptSlug: string) {
    const dept = departments.find((d: any) => d.slug === deptSlug);
    if (dept?.primary_image?.file_url) return dept.primary_image.file_url;
    return categories.find(
      (c: any) => c.department?.slug === deptSlug && c.primary_image?.file_url
    )?.primary_image?.file_url;
  }

  const tiles = [
    {
      key: "baby",
      label: "Baby",
      sub: "0–24 Months",
      href: babyGroup ? `/shop/age/${babyGroup.slug}` : "/shop?stage=baby",
      image: babyGroup?.primary_image?.file_url || departmentTileImage("baby-024-months"),
    },
    {
      key: "kids",
      label: "Kids",
      sub: undefined as string | undefined,
      href: "/shop?stage=kids",
      image: kidsGroup?.primary_image?.file_url || departmentTileImage("kids"),
    },
    {
      key: "women",
      label: "Women",
      sub: undefined as string | undefined,
      href: "/shop?department=women",
      image: departmentTileImage("women"),
    },
    {
      key: "men",
      label: "Men",
      sub: undefined as string | undefined,
      href: "/shop?department=men",
      image: departmentTileImage("men"),
    },
  ];

  return (
    <section className="container-shell mt-6 sm:mt-8">
      <div className="flex items-baseline justify-between mb-3 sm:mb-5">
        <h2 className="font-display text-xl sm:text-2xl font-bold">Shop by Category</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-5">
        {tiles.map((tile) => (
          <Link key={tile.key} href={tile.href} className="group block">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[var(--color-ink)]">
              {tile.image ? (
                <Image
                  src={tile.image}
                  alt={tile.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display font-black text-4xl text-white/15 select-none">
                    {tile.label}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="font-display font-black text-lg md:text-2xl text-white drop-shadow-sm tracking-tight leading-none">
                  {tile.label}
                </p>
                {tile.sub && (
                  <span className="inline-block mt-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/90 bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5">
                    {tile.sub}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}