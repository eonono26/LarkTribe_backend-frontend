"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Notification } from "@/lib/types";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    api.notifications().then((r) => setItems(Array.isArray(r) ? r : r.results)).catch(() => {});
  }, [loggedIn]);

  if (!loggedIn) return null;
  const unread = items.filter((n) => !n.is_read).length;

  async function markAll() {
    await api.markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => setOpen((o) => !o)} className="relative hover:opacity-70">
        <Bell size={22} />
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 bg-[var(--color-flag)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-[var(--color-line)] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)]">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs underline">Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500 p-4">Nothing yet.</p>
          ) : (
            items.slice(0, 10).map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b border-[var(--color-line)] text-sm ${n.is_read ? "" : "bg-[var(--color-mist)]"}`}>
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="text-neutral-600 text-xs mt-0.5">{n.body}</p>}
              </div>
            ))
          )}
          <Link href="/account/notifications" className="block text-center text-xs font-semibold underline py-3">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
