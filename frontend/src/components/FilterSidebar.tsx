"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Category, Brand } from "@/lib/types";

const GENDER_OPTIONS = [
  { value: "girls", label: "Girls" },
  { value: "boys", label: "Boys" },
  { value: "unisex", label: "Unisex" },
];

const PRICE_OPTIONS = [
  { value: "0-999", label: "KSh 0 – 999" },
  { value: "1000-1999", label: "KSh 1,000 – 1,999" },
  { value: "2000-2999", label: "KSh 2,000 – 2,999" },
  { value: "3000-4999", label: "KSh 3,000 – 4,999" },
  { value: "5000-", label: "KSh 5,000+" },
];

const SIZE_OPTIONS = ["2T", "3T", "4T", "XS", "S", "M", "L", "XL"];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-stone-200 py-5">
      <h4 className="text-[11px] uppercase tracking-widest font-medium mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function FilterSidebar({ categories = [], brands = [], showGender = true }: {
  categories?: Category[];
  brands?: Brand[];
  showGender?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const current = (k: string) => searchParams.get(k) || "";

  return (
    <aside className="w-full lg:w-56 shrink-0 space-y-0">
      {showGender && (
        <FilterGroup title="Gender">
          {GENDER_OPTIONS.map(g => (
            <button key={g.value} onClick={() => toggle("gender", g.value)} className={`block text-sm ${current("gender") === g.value ? "text-black font-medium" : "text-stone-500 hover:text-black"}`}>
              {g.label}
            </button>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Category">
        {categories.map(c => (
          <button key={c.slug} onClick={() => toggle("category", c.slug)} className={`block text-sm ${current("category") === c.slug ? "text-black font-medium" : "text-stone-500 hover:text-black"}`}>
            {c.name}
          </button>
        ))}
        {categories.length === 0 && <p className="text-xs text-stone-400">No categories</p>}
      </FilterGroup>

      <FilterGroup title="Price">
        {PRICE_OPTIONS.map(p => (
          <button key={p.value} onClick={() => toggle("price_range", p.value)} className={`block text-sm ${current("price_range") === p.value ? "text-black font-medium" : "text-stone-500 hover:text-black"}`}>
            {p.label}
          </button>
        ))}
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map(s => (
            <button key={s} onClick={() => toggle("size", s)} className={`w-10 h-10 text-xs border transition ${current("size") === s ? "bg-black text-white border-black" : "border-stone-200 text-stone-600 hover:border-black"}`}>
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Brand">
        {brands.map(b => (
          <button key={b.slug} onClick={() => toggle("brand", b.slug)} className={`block text-sm ${current("brand") === b.slug ? "text-black font-medium" : "text-stone-500 hover:text-black"}`}>
            {b.name}
          </button>
        ))}
        {brands.length === 0 && <p className="text-xs text-stone-400">No brands</p>}
      </FilterGroup>
    </aside>
  );
}