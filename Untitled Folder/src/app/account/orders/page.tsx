"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api.myOrders().then((r) => setOrders((Array.isArray(r) ? r : (r as { results: OrderRow[] }).results) as OrderRow[])).finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="container-shell py-10">
      <h1 className="font-display text-2xl font-black mb-1">My orders</h1>
      <p className="text-sm text-neutral-500 mb-6">&nbsp;</p>
      <AccountNav />
      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-neutral-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.order_number}
              href={`/orders/${o.order_number}`}
              className="flex items-center justify-between border border-[var(--color-line)] rounded-lg p-4 hover:bg-[var(--color-mist)]"
            >
              <div>
                <p className="font-mono font-bold">{o.order_number}</p>
                <p className="text-xs text-neutral-500">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(o.total)}</p>
                <p className="text-xs uppercase tracking-wide text-neutral-500">{o.status.replace(/_/g, " ")}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
