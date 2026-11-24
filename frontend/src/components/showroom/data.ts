import { api, mediaUrl } from "@/lib/api";
import type { Category, Department, ProductListItem } from "@/lib/types";

/** Shopping order of the store: the first wing you walk into is Babies, then Kids, Women, Men. */
export const WING_ORDER = ["baby", "kids", "women", "men"] as const;
const ACCENTS: Record<string, number> = { baby: 0xc4857f, kids: 0x4c86ad, women: 0x9c5671, men: 0x3b4a5f };
const MAX_PER_BAY = 24;

export interface StoreBay { title: string; products: ProductListItem[] }
export interface StoreWing { slug: string; title: string; subtitle: string; accent: number; bays: StoreBay[] }

function wingKey(d: Department): string | null {
  const s = `${d.slug} ${d.name}`.toLowerCase();
  if (/\bbab(y|ies)\b/.test(s) || s.includes("baby")) return "baby";
  if (/\bkids?\b/.test(s) || s.includes("kids")) return "kids";
  if (/\bwom[ae]n\b/.test(s)) return "women";
  if (/\bmen\b/.test(s) || s.includes("men")) return "men";
  return null;
}

export const productImage = (p: ProductListItem) => mediaUrl((p.image || p.image_url || "") as string);
export const backImage = (p: ProductListItem) => {
  const preferredColor = p.colors?.[0] || "";
  const gallery = p.images || [];
  const b = gallery.find((i) => i.view === "back" && i.color === preferredColor)
    || gallery.find((i) => i.view === "back" && !i.color)
    || gallery.find((i) => i.view === "back");
  return b ? mediaUrl(b.image) : undefined;
};

/** Everything comes from the API: departments -> categories -> products. Nothing is hard-coded. */
export async function loadStore(): Promise<StoreWing[]> {
  const departments: Department[] = await api.departments();
  const wanted = WING_ORDER.map((key) => departments.find((d) => wingKey(d) === key)).filter(Boolean) as Department[];
  const wings = await Promise.all(
    wanted.map(async (d) => {
      const key = wingKey(d)!;
      const [cats, pages] = await Promise.all([
        api.categories({ department: d.slug, page_size: "300" }).then((r) => r.results as Category[]).catch(() => [] as Category[]),
        Promise.all([1, 2, 3, 4, 5].map((n) => api.products({ department: d.slug, page: String(n) }).then((r) => r.results).catch(() => [] as ProductListItem[]))),
      ]);
      const seen = new Set<number>();
      const products = pages.flat().filter((p) => (seen.has(Number(p.id)) ? false : (seen.add(Number(p.id)), true)) && (p.image || p.image_url));
      const groups = new Map<string, ProductListItem[]>();
      products.forEach((p) => { const k = p.category_name || "More"; groups.set(k, [...(groups.get(k) || []), p]); });
      const rank = (name: string) => { const i = cats.findIndex((c) => c.name === name); return i === -1 ? 999 : i; };
      const bays: StoreBay[] = [...groups.entries()]
        .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1].length - a[1].length)
        .map(([title, items]) => ({ title, products: items.slice(0, MAX_PER_BAY) }));
      const count = bays.reduce((n, b) => n + b.products.length, 0);
      return { slug: key, title: key === "baby" ? "Babies" : d.name, subtitle: `${bays.length} categories · ${count} pieces`, accent: ACCENTS[key], bays } as StoreWing;
    }),
  );
  return wings.filter((w) => w.bays.length > 0);
}
