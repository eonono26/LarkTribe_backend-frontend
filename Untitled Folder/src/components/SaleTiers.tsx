import Link from "next/link";

const TIERS = [20, 30, 40, 50, 60];

/** "Under SALE: 20% OFF / 30% OFF / ..." row, matching the Rookie USA
 * sale-tier nav. Links to /deals?min_discount=N. */
export default function SaleTiers({ active }: { active?: number }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <Link
        href="/deals"
        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
          !active
            ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
            : "border-[var(--color-line)] hover:border-[var(--color-ink)]"
        }`}
      >
        All deals
      </Link>
      {TIERS.map((t) => (
        <Link
          key={t}
          href={`/deals?min_discount=${t}`}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
            active === t
              ? "bg-[var(--color-flag)] text-white border-[var(--color-flag)]"
              : "border-[var(--color-line)] hover:border-[var(--color-flag)]"
          }`}
        >
          {t}% OFF
        </Link>
      ))}
    </div>
  );
}
