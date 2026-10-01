"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SupportTicket } from "@/lib/types";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [reply, setReply] = useState<Record<number, string>>({});

  function load() {
    api.adminSupportTickets().then((r) => setTickets(Array.isArray(r) ? r : r.results));
  }
  useEffect(load, []);

  async function sendReply(id: number) {
    if (!reply[id]) return;
    await api.adminReplyTicket(id, reply[id]);
    setReply((r) => ({ ...r, [id]: "" }));
    load();
  }

  async function resolve(id: number) {
    await api.adminResolveTicket(id);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-black mb-6">Customer support</h1>
      {tickets.length === 0 ? (
        <p className="text-sm text-neutral-500">No tickets.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className="border border-[var(--color-line)] rounded-lg p-4">
              <div className="flex justify-between">
                <p className="font-semibold">{t.subject}</p>
                <span className="text-xs uppercase tracking-wide text-neutral-500">{t.status}</span>
              </div>
              <p className="text-sm text-neutral-600 mt-1">{t.message}</p>
              <p className="text-xs text-neutral-400 mt-1">from {t.user_name}</p>

              {t.replies.length > 0 && (
                <div className="mt-3 space-y-1 text-sm border-t border-[var(--color-line)] pt-3">
                  {t.replies.map((r) => (
                    <p key={r.id}>
                      <span className="font-semibold">{r.is_staff_reply ? "Support" : t.user_name}:</span> {r.message}
                    </p>
                  ))}
                </div>
              )}

              {t.status !== "resolved" && t.status !== "closed" && (
                <div className="flex gap-2 mt-3">
                  <input
                    value={reply[t.id] ?? ""}
                    onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))}
                    placeholder="Reply…"
                    className="flex-1 bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
                  />
                  <button onClick={() => sendReply(t.id)} className="btn btn-ink btn-sm">
                    Reply
                  </button>
                  <button onClick={() => resolve(t.id)} className="border border-[var(--color-line)] text-xs font-semibold uppercase px-4 rounded-full">
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
