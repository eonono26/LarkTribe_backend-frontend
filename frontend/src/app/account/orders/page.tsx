"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import { isLoggedIn } from "@/lib/auth";

interface OrderRow {
  order_number: string;
  status: string;
  total: string;
  created_at: string;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { formatPrice } = useLocalization();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    api
      .myOrders()
      .then((response) => {
        const rows = Array.isArray(response)
          ? response
          : (response as { results?: OrderRow[] }).results ?? [];
        setOrders(rows as OrderRow[]);
      })
      .catch(() => setError("We couldn't load your orders. Please try again."))
      .finally(() => setLoading(false));
  }

  function retryLoad() {
    setLoading(true);
    setError("");
    load();
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login?next=%2Faccount%2Forders");
      return;
    }
    load();
  }, [router]);

  return (
    <main className="account-page">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Your account</span>
      <h1 className="text-[13px] tracking-[0.08em] mb-2 font-editorial ">Orders</h1>
      <p className="mb-6 text-sm text-neutral-500">Track your purchases from confirmation to delivery.</p>
      <AccountNav />
      {loading ? (
        <div className="space-y-3" aria-label="Loading orders">
          {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse border border-stone-200 bg-white" />)}
        </div>
      ) : error ? (
        <div role="alert" className="border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>{error}</p>
          <button onClick={retryLoad} className="mt-3 font-semibold underline">Try again</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
          <PackageOpen className="mx-auto mb-4 text-stone-400" size={28} />
          <h2 className="text-[13px] tracking-[0.08em] font-editorial ">Your next find is waiting</h2>
          <p className="mt-2 text-sm text-neutral-500">Orders you place will appear here with their delivery updates.</p>
          <Link href="/shop" className="btn btn-ink mt-5">Explore the shop</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.order_number}
              href={`/orders/${o.order_number}`}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-stone-200 bg-white p-4 transition hover:border-stone-400 hover:shadow-sm sm:gap-6 sm:p-5"
            >
              <div className="min-w-0">
                <p className="break-all font-mono text-sm font-bold sm:text-base">Order {o.order_number}</p>
                <p className="text-xs text-neutral-500">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(o.total)}</p>
                <span className="mt-1 inline-flex bg-stone-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                  {o.status.replace(/_/g, " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
