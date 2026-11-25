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
    // The URL query is an external initial value; update the controlled form after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <form onSubmit={submit} className="space-y-4 border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-[13px] tracking-[0.08em] font-display ">Contact support</h2>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (e.g. Order #12345 hasn't arrived)"
        className="w-full min-w-0 border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-black"
        required
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell us what's going on…"
        rows={4}
        className="w-full min-w-0 resize-y border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-black"
        required
      />
      {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
      <button
        disabled={saving}
        className="btn btn-ink"
      >
        {saving ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function TicketThread({ ticket, onReplied }: { ticket: SupportTicket; onReplied: () => void }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      await api.replySupportTicket(ticket.id, reply.trim());
      setReply("");
      onReplied();
    } catch {
      setError("Couldn't send your reply. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 font-semibold">{ticket.subject}</p>
        <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-none bg-[var(--color-mist)]">
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
        <form onSubmit={sendReply} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply…"
            className="min-w-0 flex-1 border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-black"
          />
          <button disabled={sending} className="min-h-10 px-4 text-left text-xs font-semibold underline disabled:opacity-40 sm:text-center">
            {sending ? "Sending…" : "Reply"}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-[var(--color-flag)]">{error}</p>}
    </div>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function load() {
    api
      .supportTickets()
      .then((t) => {
        setTickets(Array.isArray(t) ? t : t.results);
        setLoadError("");
      })
      .catch(() => setLoadError("We couldn't load your support requests. Please try again."))
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

  return (
    <main className="account-page">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Your account</span>
      <h1 className="text-[13px] tracking-[0.08em] mb-2 font-editorial ">Help & support</h1>
      <p className="mb-6 text-sm text-neutral-500">Send our team a message and follow the conversation here.</p>
      <AccountNav />

      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <NewTicketForm onCreated={load} />

        <div className="min-w-0">
          <h2 className="text-[13px] tracking-[0.08em] mb-3 font-editorial ">Your tickets</h2>
          {loading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : loadError ? (
            <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>{loadError}</p>
              <button onClick={retryLoad} className="mt-2 font-semibold underline">Try again</button>
            </div>
          ) : tickets.length === 0 ? (
            <p className="border border-dashed border-stone-300 bg-white p-5 text-sm text-neutral-500">No support requests yet.</p>
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
