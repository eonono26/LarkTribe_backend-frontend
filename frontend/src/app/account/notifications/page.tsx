"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Notification } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  order: "Order",
  promotion: "Promotion",
  recommendation: "For you",
  system: "System",
  support: "Support",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login?next=%2Faccount%2Fnotifications");
      return;
    }
    Promise.all([api.notifications(), api.notificationPreferences()])
      .then(([n, p]) => {
        setItems(Array.isArray(n) ? n : n.results);
        setPrefs(p as Record<string, boolean>);
      })
      .catch(() => setError("We couldn't load your notifications. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, [router]);

  async function togglePref(key: string) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await api.updateNotificationPreferences({ [key]: next[key] });
    } catch {
      setPrefs(prefs);
      setError("Your notification preference couldn't be saved.");
    }
  }

  if (loading) return <main className="account-page text-neutral-400">Loading notifications…</main>;

  return (
    <main className="account-page">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Your account</span>
      <h1 className="mb-2 font-editorial text-3xl sm:text-4xl">Notifications</h1>
      <p className="mb-6 text-sm text-neutral-500">Stay up to date with orders, offers, and account activity.</p>
      <AccountNav />
      {error && <p role="alert" className="mb-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="space-y-3 lg:col-span-2">
        {items.length === 0 ? (
          <div className="border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
            You&apos;re all caught up.
          </div>
        ) : (
          <>
            {items.map((n) => (
              <div key={n.id} className={`border p-4 sm:p-5 ${n.is_read ? "border-stone-200 bg-white" : "border-stone-300 bg-stone-100"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-neutral-400">
                    {CATEGORY_LABEL[n.category] ?? n.category}
                  </span>
                  <span className="text-[10px] text-neutral-400">{new Date(n.sent_at).toLocaleDateString()}</span>
                </div>
                <p className="font-semibold mt-1">{n.title}</p>
                {n.body && <p className="text-sm text-neutral-600 mt-1">{n.body}</p>}
              </div>
            ))}
          </>
        )}
      </div>

      {prefs && (
        <div className="border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 font-editorial text-2xl">Preferences</h2>
          <div className="space-y-3">
            {Object.entries(prefs).map(([key, value]) => (
              <label key={key} className="flex min-h-11 items-center justify-between gap-4 border-b border-stone-100 pb-2 text-sm last:border-0">
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
                <input type="checkbox" checked={value} onChange={() => togglePref(key)} />
              </label>
            ))}
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
