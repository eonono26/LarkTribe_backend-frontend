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
  const [loadError, setLoadError] = useState("");

  function load() {
    Promise.all([api.availableCoupons(), api.myCoupons()])
      .then(([a, m]) => {
        setAvailable(a);
        setMine(m);
      })
      .catch(() => setLoadError("We couldn't load your coupons. Please try again."))
      .finally(() => setLoading(false));
  }

  function retryLoad() {
    setLoading(true);
    setLoadError("");
    load();
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  async function handleClaim(code: string) {
    setClaiming(code);
    try {
      await api.claimCoupon(code);
      retryLoad();
    } catch {
      setLoadError("We couldn't save that coupon. Please try again.");
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
    <main className="account-page">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Your account</span>
      <h1 className="mb-2 font-editorial text-3xl sm:text-4xl">Coupons</h1>
      <p className="mb-6 text-sm text-neutral-500">Save offers here and apply an eligible code at checkout.</p>
      <AccountNav />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : loadError ? (
        <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{loadError}</p>
          <button onClick={retryLoad} className="mt-2 font-semibold underline">Try again</button>
        </div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-editorial text-2xl mb-3">Saved coupons</h2>
            {mine.length === 0 ? (
              <p className="text-neutral-500">You haven&apos;t saved any coupons yet — grab one below.</p>
            ) : (
              <div className="space-y-3">
                {mine.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-col items-start justify-between gap-3 border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
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
                      className="min-h-10 border border-[var(--color-ink)] px-4 py-2 text-xs font-semibold uppercase transition hover:bg-black hover:text-white"
                    >
                      {copied === claim.coupon.code ? "Copied!" : "Copy code"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-editorial text-2xl mb-3">Available coupons</h2>
            {available.length === 0 ? (
              <p className="text-neutral-500">No coupons available right now — check back soon.</p>
            ) : (
              <div className="space-y-3">
                {available.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col items-start justify-between gap-3 border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
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
                        className="btn btn-signal btn-sm shrink-0"
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
