import Link from "next/link";
import Image from "next/image";
import type { AgeGroup } from "@/lib/types";

/** Matches lakkids.com's "Shop by" row — image tiles for Girls / Boys /
 * Gen Z / Baby right under the hero banners.
 *
 * AgeGroup is age-only (stage: baby/kids/teens) — it no longer carries
 * gender. So "Girls" and "Boys" here are Product.gender filters (not tied
 * to a specific age group), while "Baby" and "Gen Z" pick a representative
 * age group from the baby/teens stage respectively. */
export default function ShopByGender({
  ageGroups = [],
}: {
  ageGroups?: AgeGroup[];
}) {
  const babyGroups = ageGroups.filter((g) => g.stage === "baby");
  const teenGroups = ageGroups.filter((g) => g.stage === "teens");

  // Baby tile: youngest baby-stage age group (lowest min_age_years).
  const babyGroup = [...babyGroups].sort(
    (a, b) => (a.min_age_years ?? 0) - (b.min_age_years ?? 0)
  )[0];

  // Gen Z tile: the teens-stage age group, preferring an explicit "teen" name.
  const teenGroup =
    teenGroups.find((g) => g.name.toLowerCase().includes("teen")) || teenGroups[0];

  // Prefer any age-group photo already on hand for Girls/Boys too, so the
  // tile is never forced into the text-only fallback unless the catalog
  // genuinely has no imagery yet.
  const anyGroupImage = [...babyGroups, ...ageGroups.filter((g) => g.stage === "kids"), ...teenGroups].find(
    (g) => g.primary_image?.file_url
  )?.primary_image?.file_url;

  const tiles = [
    { label: "Baby", href: babyGroup ? `/shop/age/${babyGroup.slug}` : "/shop?stage=baby", image: babyGroup?.primary_image?.file_url },
    { label: "Girls", href: "/shop?gender=girls", image: anyGroupImage },
    { label: "Boys", href: "/shop?gender=boys", image: anyGroupImage },
    {
      label: "Gen Z",
      href: teenGroup ? `/shop/age/${teenGroup.slug}` : "/shop?stage=teens",
      image: teenGroup?.primary_image?.file_url,
    },
  ];

  return (
    <section className="container-shell mt-6 sm:mt-8">
      <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 sm:mb-5">Shop by</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-5">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="group block">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[var(--color-ink)]">
              {tile.image ? (
                <>
                  <Image
                    src={tile.image}
                    alt={tile.label}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                </>
              ) : null}
              <p className="absolute bottom-3 left-4 font-display font-black text-lg md:text-2xl text-white drop-shadow-sm tracking-tight">
                {tile.label}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
