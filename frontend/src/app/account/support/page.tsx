"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { SupportTicket } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function NewTicketForm({ onCreated }: { onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefill = new URLSearchParams(window.location.search).get("subject");
    if (prefill) setSubject(prefill);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.openSupportTicket(subject.trim(), message.trim());
      setSubject("");
      setMessage("");
      onCreated();
    } catch {
      setError("Couldn't send that — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 border border-[var(--color-line)] rounded-lg p-4">
      <h2 className="font-display font-bold">Contact support</h2>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (e.g. Order #12345 hasn't arrived)"
        className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
        required
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell us what's going on…"
        rows={4}
        className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none resize-none"
        required
      />
      {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
      <button
        disabled={saving}
        className="bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide px-6 py-3 rounded-full disabled:opacity-40"
      >
        {saving ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function TicketThread({ ticket, onReplied }: { ticket: SupportTicket; onReplied: () => void }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.replySupportTicket(ticket.id, reply.trim());
      setReply("");
      onReplied();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-[var(--color-line)] rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{ticket.subject}</p>
        <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-[var(--color-mist)]">
          {STATUS_LABEL[ticket.status] ?? ticket.status}
        </span>
      </div>
      <p className="text-sm text-neutral-600 mt-2">{ticket.message}</p>

      {ticket.replies.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-line)] pt-3">
          {ticket.replies.map((r) => (
            <div key={r.id} className={`text-sm ${r.is_staff_reply ? "" : "text-neutral-600"}`}>
              <span className="font-semibold">{r.is_staff_reply ? "Support team" : r.author_name}:</span> {r.message}
            </div>
          ))}
        </div>
      )}

      {ticket.status !== "closed" && ticket.status !== "resolved" && (
        <form onSubmit={sendReply} className="flex gap-2 mt-3">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply…"
            className="flex-1 bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button disabled={sending} className="text-xs font-semibold underline disabled:opacity-40">
            {sending ? "Sending…" : "Reply"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .supportTickets()
      .then((t) => setTickets(Array.isArray(t) ? t : t.results))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  return (
    <main className="container-shell py-10">
      <h1 className="font-display text-2xl font-black mb-1">Help & support</h1>
      <p className="text-sm text-neutral-500 mb-6">&nbsp;</p>
      <AccountNav />

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <NewTicketForm onCreated={load} />

        <div>
          <h2 className="font-display font-bold mb-3">Your tickets</h2>
          {loading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-neutral-500">No support requests yet.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <TicketThread key={t.id} ticket={t} onReplied={load} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
