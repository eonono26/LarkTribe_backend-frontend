"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "-created_at", label: "Featured / Curators' Pick" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
];

export default function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="appearance-none bg-stone-100 hover:bg-stone-200 text-espresso text-xs uppercase tracking-wider py-2 pl-3 pr-6 rounded-full focus:outline-none cursor-pointer transition-colors"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
