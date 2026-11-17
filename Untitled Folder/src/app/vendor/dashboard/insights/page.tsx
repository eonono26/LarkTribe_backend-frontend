"use client";

import { useEffect, useState } from "react";
import { vendorApi, VendorProduct } from "@/lib/vendor-api";
import { formatKES } from "@/lib/api";

interface PricingSuggestion {
  product_id: number;
  current_price: number;
  suggested_price: number;
  change_percent: number;
  reason: string;
}

interface DemandForecast {
  product_id: number;
  weekly_history: number[];
  forecast_units_next_period: number;
  current_stock: number;
  reorder_point: number;
  reorder_recommended: boolean;
  reorder_quantity: number;
}

export default function VendorInsightsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [pricing, setPricing] = useState<PricingSuggestion[]>([]);
  const [forecast, setForecast] = useState<DemandForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([vendorApi.myProducts(), vendorApi.pricingSuggestions(), vendorApi.demandForecast()])
      .then(([p, pricingRes, forecastRes]) => {
        setProducts(Array.isArray(p) ? p : p.results);
        setPricing((pricingRes as PricingSuggestion[]) || []);
        setForecast((forecastRes as DemandForecast[]) || []);
      })
      .catch(() => setError("Couldn't load AI insights right now."))
      .finally(() => setLoading(false));
  }, []);

  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `Product #${id}`;

  if (loading) return <p className="text-sm text-neutral-500">Loading AI insights…</p>;
  if (error) return <p className="text-sm text-[var(--color-flag)]">{error}</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-black mb-1">AI Sales Insights</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Pricing and demand signals generated from recent sales activity across your store.
        </p>
      </div>

      <section>
        <h2 className="font-display font-bold mb-3">Dynamic pricing suggestions</h2>
        {pricing.length === 0 ? (
          <p className="text-sm text-neutral-500">No pricing suggestions yet — check back once you have more sales history.</p>
        ) : (
          <div className="space-y-2">
            {pricing.map((s) => (
              <div key={s.product_id} className="border border-[var(--color-line)] rounded-lg p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2 font-semibold">
                  <span>{productName(s.product_id)}</span>
                  <span className={s.change_percent > 0 ? "text-[var(--dept-maternity)]" : "text-[var(--color-flag)]"}>
                    {formatKES(s.current_price)} → {formatKES(s.suggested_price)} ({s.change_percent > 0 ? "+" : ""}
                    {s.change_percent}%)
                  </span>
                </div>
                <p className="text-neutral-500 text-xs mt-1">{s.reason}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold mb-3">Inventory & demand forecast</h2>
        {forecast.length === 0 ? (
          <p className="text-sm text-neutral-500">No forecast data yet — this fills in as your orders build up.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {forecast.map((f) => (
              <div key={f.product_id} className="border border-[var(--color-line)] rounded-lg p-4 text-sm">
                <p className="font-semibold">{productName(f.product_id)}</p>
                <p className="text-neutral-500 text-xs mt-1">
                  Forecast next period: <span className="font-semibold text-[var(--color-ink)]">{f.forecast_units_next_period} units</span>
                  {" · "}Current stock: <span className="font-semibold text-[var(--color-ink)]">{f.current_stock}</span>
                </p>
                {f.reorder_recommended ? (
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-[var(--color-flag)]/10 text-[var(--color-flag)]">
                    Reorder {f.reorder_quantity} units — below reorder point ({f.reorder_point})
                  </span>
                ) : (
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-[var(--dept-maternity)]/10 text-[var(--dept-maternity)]">
                    Stock healthy
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
