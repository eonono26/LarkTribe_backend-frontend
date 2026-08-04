"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Notification } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  order: "Order",
  promotion: "Promotion",
  recommendation: "For you",
  vendor: "Vendor",
  system: "System",
  support: "Support",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    Promise.all([api.notifications(), api.notificationPreferences()])
      .then(([n, p]) => {
        setItems(Array.isArray(n) ? n : n.results);
        setPrefs(p as Record<string, boolean>);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function togglePref(key: string) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await api.updateNotificationPreferences({ [key]: next[key] });
  }

  if (loading) return <main className="container-shell py-10 text-neutral-400">Loading…</main>;

  return (
    <main className="container-shell py-10 grid md:grid-cols-3 gap-10">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-black mb-6">Notifications</h1>
        {items.length === 0 ? (
          <p className="text-neutral-500">You&apos;re all caught up.</p>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className={`border border-[var(--color-line)] rounded-lg p-4 ${n.is_read ? "" : "bg-[var(--color-mist)]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-neutral-400">
                    {CATEGORY_LABEL[n.category] ?? n.category}
                  </span>
                  <span className="text-[10px] text-neutral-400">{new Date(n.sent_at).toLocaleDateString()}</span>
                </div>
                <p className="font-semibold mt-1">{n.title}</p>
                {n.body && <p className="text-sm text-neutral-600 mt-1">{n.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {prefs && (
        <div>
          <h2 className="font-display font-bold mb-4">Preferences</h2>
          <div className="space-y-3">
            {Object.entries(prefs).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between text-sm">
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
                <input type="checkbox" checked={value} onChange={() => togglePref(key)} />
              </label>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
