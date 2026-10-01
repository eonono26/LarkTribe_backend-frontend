import { api } from "@/lib/api";
import type { AgeGroup } from "@/lib/types";

export type AgeRow = {
  key: string;
  title: string;      // "BOY" / "GIRL"
  subtitle: string;   // age group name from the DB, e.g. "2-4 Years"
  href: string;       // /shop?stage=kids&gender=boys&age_group=2-4-years
  image: string | null;
};

const GENDERS = [
  { value: "girls", title: "Girl" },
  { value: "boys", title: "Boy" },
  // Product.gender is matched exactly by the backend (filters.py filter_gender),
  // and the vendor form defaults new products to "unisex", so without this row
  // those products would never appear in the menu.
  { value: "unisex", title: "Unisex" },
] as const;

function imageOf(ag: AgeGroup): string | null {
  return (
    ag.primary_image?.file_url ??
    ag.media_files?.find((m) => m.is_primary)?.file_url ??
    ag.media_files?.[0]?.file_url ??
    null
  );
}

/** true if at least one product matches this exact combination */
async function hasProducts(params: Record<string, string>): Promise<boolean> {
  try {
    const r = await api.products({ ...params, page_size: "1" });
    return (r.count ?? r.results?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Builds Zara-style rows for one stage ("kids" | "baby"):
 *   GIRL 2-3 YRS, BOY 2-3 YRS, UNISEX 2-3 YRS, GIRL 4-5 YRS, ...
 * Driven entirely by the DB: active age groups of the stage x gender,
 * and a row is kept only if that combination actually has products.
 */
export async function buildAgeRows(stage: "kids" | "baby"): Promise<AgeRow[]> {
  const res = await api.ageGroupsByStage(stage);
  const groups = (res.age_groups || [])
    .filter((a) => a.is_active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const combos = groups.flatMap((ag) =>
    GENDERS.map((g) => ({ ag, g }))
  );

  const checks = await Promise.all(
    combos.map(({ ag, g }) =>
      hasProducts({ stage, gender: g.value, age_group: ag.slug })
    )
  );

  return combos
    .filter((_, i) => checks[i])
    .map(({ ag, g }) => ({
      key: `${stage}-${g.value}-${ag.slug}`,
      title: g.title,
      subtitle: ag.name,
      href: `/shop?stage=${stage}&gender=${g.value}&age_group=${encodeURIComponent(ag.slug)}`,
      image: imageOf(ag),
    }));
}
