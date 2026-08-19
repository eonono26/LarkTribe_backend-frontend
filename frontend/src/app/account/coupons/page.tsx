"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import { isLoggedIn } from "@/lib/auth";
import type { WalletCoupon, CouponClaim } from "@/lib/types";

function discountLabel(c: { percent_off: number | null; amount_off: string | null }, formatPrice: (v: string | number) => string) {
  if (c.percent_off) return `${c.percent_off}% off`;
  if (c.amount_off) return `${formatPrice(c.amount_off)} off`;
  return "Discount";
}

export default function CouponsPage() {
  const router = useRouter();
  const { formatPrice } = useLocalization();
  const [available, setAvailable] = useState<WalletCoupon[]>([]);
  const [mine, setMine] = useState<CouponClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([api.availableCoupons(), api.myCoupons()])
      .then(([a, m]) => {
        setAvailable(a);
        setMine(m);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleClaim(code: string) {
    setClaiming(code);
    try {
      await api.claimCoupon(code);
      load();
    } finally {
      setClaiming(null);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <main className="container-shell py-10 max-w-2xl">
      <h1 className="font-display text-2xl font-black mb-1">My coupons</h1>
      <p className="text-sm text-neutral-500 mb-6">&nbsp;</p>
      <AccountNav />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-display text-lg font-black mb-3">Saved coupons</h2>
            {mine.length === 0 ? (
              <p className="text-neutral-500">You haven&apos;t saved any coupons yet — grab one below.</p>
            ) : (
              <div className="space-y-3">
                {mine.map((claim) => (
                  <div
                    key={claim.id}
                    className="border border-[var(--color-line)] rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono font-bold">{claim.coupon.code}</p>
                      <p className="text-sm text-neutral-600">{discountLabel(claim.coupon, formatPrice)}</p>
                      {claim.coupon.valid_until && (
                        <p className="text-xs text-neutral-400">
                          Valid until {new Date(claim.coupon.valid_until).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(claim.coupon.code)}
                      className="border border-[var(--color-ink)] px-4 py-2 rounded-full text-xs font-semibold uppercase shrink-0"
                    >
                      {copied === claim.coupon.code ? "Copied!" : "Copy code"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-lg font-black mb-3">Available coupons</h2>
            {available.length === 0 ? (
              <p className="text-neutral-500">No coupons available right now — check back soon.</p>
            ) : (
              <div className="space-y-3">
                {available.map((c) => (
                  <div
                    key={c.id}
                    className="border border-[var(--color-line)] rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono font-bold">{c.code}</p>
                      <p className="text-sm text-neutral-600">{discountLabel(c, formatPrice)}</p>
                      {c.valid_until && (
                        <p className="text-xs text-neutral-400">
                          Valid until {new Date(c.valid_until).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {c.saved ? (
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-signal)] shrink-0">
                        Saved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaim(c.code)}
                        disabled={claiming === c.code}
                        className="bg-[var(--color-signal)] text-[var(--color-ink)] px-4 py-2 rounded-full text-xs font-bold uppercase shrink-0 disabled:opacity-40"
                      >
                        {claiming === c.code ? "Saving…" : "Save coupon"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
