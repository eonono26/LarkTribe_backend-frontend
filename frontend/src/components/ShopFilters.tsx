"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Plus, Minus, Check } from "lucide-react";
import type { Category, Brand, AgeGroup } from "@/lib/types";
import SortSelect from "@/components/SortSelect";

const GENDERS = [
  { value: "girls", label: "Girls" },
  { value: "boys", label: "Boys" },
  { value: "unisex", label: "Unisex" },
];

const PRICES = [
  { value: "0-999", label: "Under KSh 1,000" },
  { value: "1000-1999", label: "KSh 1,000 – 1,999" },
  { value: "2000-2999", label: "KSh 2,000 – 2,999" },
  { value: "3000-4999", label: "KSh 3,000 – 4,999" },
  { value: "5000-", label: "KSh 5,000 and above" },
];

const SIZES = ["2T", "3T", "4T", "XS", "S", "M", "L", "XL"];

const FILTER_KEYS = ["gender", "age_group", "category", "price_range", "size", "brand", "on_sale"];

type Props = {
  categories: Category[];
  brands: Brand[];
  ageGroups?: AgeGroup[];
  showGender?: boolean;
  totalCount: number;
  sort: string;
};

/* ---------- small building blocks ---------- */

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-100">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-[13px] font-medium tracking-wide">{title}</span>
        {open ? <Minus className="w-4 h-4 text-stone-400" strokeWidth={1.5} /> : <Plus className="w-4 h-4 text-stone-400" strokeWidth={1.5} />}
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[13px] border transition ${
        active ? "bg-black text-white border-black" : "bg-white text-stone-700 border-stone-200 hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-1.5 text-left group">
      <span className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition ${active ? "bg-black border-black" : "border-stone-300 group-hover:border-black"}`}>
        {active && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
      </span>
      <span className={`text-[14px] ${active ? "text-black" : "text-stone-600 group-hover:text-black"}`}>{children}</span>
    </button>
  );
}

/* ---------- main component ---------- */

export default function ShopFilters({ categories, brands, ageGroups = [], showGender = true, totalCount, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const [pending, startTransition] = useTransition();

  const get = (k: string) => searchParams.get(k) || "";

  function push(params: URLSearchParams) {
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }
  function toggle(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (p.get(key) === value) p.delete(key);
    else p.set(key, value);
    push(p);
  }
  function clearAll() {
    const p = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => p.delete(k));
    push(p);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  /* active chips */
  const chips: { key: string; label: string }[] = [];
  if (get("gender")) chips.push({ key: "gender", label: GENDERS.find((g) => g.value === get("gender"))?.label || get("gender") });
  if (get("age_group")) chips.push({ key: "age_group", label: ageGroups.find((a) => a.slug === get("age_group"))?.name || get("age_group") });
  if (get("category")) chips.push({ key: "category", label: categories.find((c) => c.slug === get("category"))?.name || get("category") });
  if (get("price_range")) chips.push({ key: "price_range", label: PRICES.find((p) => p.value === get("price_range"))?.label || get("price_range") });
  if (get("size")) chips.push({ key: "size", label: `Size ${get("size")}` });
  if (get("brand")) chips.push({ key: "brand", label: brands.find((b) => b.slug === get("brand"))?.name || get("brand") });
  if (get("on_sale")) chips.push({ key: "on_sale", label: "On sale" });

  const visibleCats = showAllCats ? categories : categories.slice(0, 8);
  const hasQuickRow = showGender || ageGroups.length > 0;

  return (
    <>
      {/* ---------- sticky bar ---------- */}
      <div className="sticky top-16 lg:top-20 z-30 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="container-shell">
          <div className="flex items-center gap-3 py-3">
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-full border border-stone-300 hover:border-black text-[13px] font-medium transition shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
              Filter
              {chips.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] flex items-center justify-center">{chips.length}</span>
              )}
            </button>

            {/* active filter chips (scroll on mobile) */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {chips.map((c) => (
                <button
                  key={c.key}
                  onClick={() => toggle(c.key, get(c.key))}
                  className="flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-stone-100 hover:bg-stone-200 text-[12px] whitespace-nowrap transition"
                >
                  {c.label}
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              ))}
              {chips.length > 1 && (
                <button onClick={clearAll} className="text-[12px] text-stone-500 hover:text-black underline underline-offset-4 whitespace-nowrap px-1">
                  Clear all
                </button>
              )}
            </div>

            <span className={`hidden sm:block text-[12px] text-stone-500 whitespace-nowrap ${pending ? "opacity-40" : ""}`}>{totalCount} items</span>
            <SortSelect current={sort} />
          </div>

          {/* quick row: gender + age, always visible so nobody has to hunt for them */}
          {hasQuickRow && (
            <div className="flex items-center gap-x-6 gap-y-2 pb-3 overflow-x-auto no-scrollbar">
              {showGender && (
                <div className="flex items-center gap-2 shrink-0">
                  {GENDERS.map((g) => (
                    <Chip key={g.value} active={get("gender") === g.value} onClick={() => toggle("gender", g.value)}>{g.label}</Chip>
                  ))}
                </div>
              )}
              {showGender && ageGroups.length > 0 && <span className="h-5 w-px bg-stone-200 shrink-0" />}
              {ageGroups.length > 0 && (
                <div className="flex items-center gap-2">
                  {ageGroups.map((a) => (
                    <Chip key={a.slug} active={get("age_group") === a.slug} onClick={() => toggle("age_group", a.slug)}>{a.name}</Chip>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- drawer ---------- */}
      <div className={`fixed inset-0 z-[90] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <aside
          role="dialog"
          aria-label="Filters"
          className={`absolute inset-y-0 right-0 w-full max-w-[400px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-6 h-16 border-b border-stone-100 shrink-0">
            <h2 className="text-[15px] font-medium">Filter</h2>
            <button onClick={() => setOpen(false)} aria-label="Close filters" className="p-2 -mr-2"><X className="w-5 h-5" strokeWidth={1.5} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            {showGender && (
              <Section title="Shop for">
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <Chip key={g.value} active={get("gender") === g.value} onClick={() => toggle("gender", g.value)}>{g.label}</Chip>
                  ))}
                </div>
              </Section>
            )}

            {ageGroups.length > 0 && (
              <Section title="Age">
                <div className="flex flex-wrap gap-2">
                  {ageGroups.map((a) => (
                    <Chip key={a.slug} active={get("age_group") === a.slug} onClick={() => toggle("age_group", a.slug)}>{a.name}</Chip>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Category">
              {categories.length === 0 ? (
                <p className="text-[13px] text-stone-400">No categories</p>
              ) : (
                <>
                  {visibleCats.map((c) => (
                    <Row key={c.slug} active={get("category") === c.slug} onClick={() => toggle("category", c.slug)}>{c.name}</Row>
                  ))}
                  {categories.length > 8 && (
                    <button onClick={() => setShowAllCats(!showAllCats)} className="mt-2 text-[12px] text-stone-500 hover:text-black underline underline-offset-4">
                      {showAllCats ? "Show less" : `Show all ${categories.length}`}
                    </button>
                  )}
                </>
              )}
            </Section>

            <Section title="Price">
              {PRICES.map((p) => (
                <Row key={p.value} active={get("price_range") === p.value} onClick={() => toggle("price_range", p.value)}>{p.label}</Row>
              ))}
            </Section>

            <Section title="Size" defaultOpen={false}>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggle("size", s)}
                    className={`min-w-[48px] h-10 px-3 rounded-lg text-[13px] border transition ${
                      get("size") === s ? "bg-black text-white border-black" : "border-stone-200 text-stone-700 hover:border-black"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Brand" defaultOpen={false}>
              {brands.length === 0 ? (
                <p className="text-[13px] text-stone-400">No brands</p>
              ) : (
                brands.map((b) => (
                  <Row key={b.slug} active={get("brand") === b.slug} onClick={() => toggle("brand", b.slug)}>{b.name}</Row>
                ))
              )}
            </Section>

            <Section title="Offers" defaultOpen={false}>
              <Row active={get("on_sale") === "true"} onClick={() => toggle("on_sale", "true")}>On sale</Row>
            </Section>
          </div>

          <div className="shrink-0 border-t border-stone-100 p-4 flex gap-3">
            <button
              onClick={clearAll}
              disabled={chips.length === 0}
              className="h-12 px-5 rounded-full border border-stone-300 text-[13px] disabled:opacity-40 hover:border-black transition"
            >
              Clear all
            </button>
            <button onClick={() => setOpen(false)} className="flex-1 h-12 rounded-full bg-black text-white text-[13px] font-medium hover:bg-stone-800 transition">
              {pending ? "Updating…" : `View ${totalCount} items`}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
