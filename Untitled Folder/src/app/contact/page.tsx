"use client";

import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message.trim()) return;
    setStatus("sending");
    try {
      if (isLoggedIn()) {
        await api.openSupportTicket(
          `Contact form — ${form.name || "Website visitor"}`,
          `${form.message}\n\nReply-to: ${form.email}`
        );
      } else {
        api.track("contact_form_submitted", { name: form.name, email: form.email });
      }
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="container-shell py-12">
      <h1 className="font-display text-3xl font-black mb-2">Contact us</h1>
      <p className="text-sm text-neutral-500 mb-8 max-w-xl">
        Have a question about an order, a vendor, or the platform? Send us a message and we'll get back to you.
      </p>

      <div className="grid md:grid-cols-2 gap-10">
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <input
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
            required
          />
          <textarea
            placeholder="How can we help?"
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none resize-none"
            required
          />
          {status === "sent" && <p className="text-sm text-green-700">Thanks — we've got your message.</p>}
          {status === "error" && <p className="text-sm text-[var(--color-flag)]">Something went wrong, please try again.</p>}
          <button
            disabled={status === "sending"}
            className="btn btn-ink"
          >
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
          {!isLoggedIn() && (
            <p className="text-xs text-neutral-400">
              Log in to track replies from My account → Help & Support.
            </p>
          )}
        </form>

        <div className="space-y-5 text-sm">
          <div className="flex items-start gap-3">
            <Mail size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-neutral-500">support@larktribe.co.ke</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Phone</p>
              <p className="text-neutral-500">+254 700 000 000</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Office</p>
              <p className="text-neutral-500">Nairobi, Kenya</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
