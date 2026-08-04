"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", first_name: "", last_name: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await auth.register(form);
      await auth.login(form.username, form.password);
      router.push("/");
    } catch {
      setError("Couldn't create your account — check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-shell py-16 max-w-sm mx-auto">
      <h1 className="font-display text-2xl font-black mb-1">Create your account</h1>
      <p className="text-sm text-neutral-500 mb-6">Join duka for faster checkout, order tracking, and wishlists.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
          />
          <input
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className="bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
          />
        </div>
        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        <input
          placeholder="Phone (for M-Pesa & delivery updates)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-[var(--color-signal)] text-[var(--color-ink)] font-bold uppercase text-sm tracking-wide py-3.5 rounded-full disabled:opacity-40"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-neutral-500 mt-6">
        Already have an account? <Link href="/login" className="underline font-semibold">Sign in</Link>
      </p>
    </main>
  );
}
