"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { auth, isLoggedIn } from "@/lib/auth";

export default function VendorApplyPage() {
  const router = useRouter();
  const [needsAccount] = useState(!isLoggedIn());
  const [account, setAccount] = useState({ username: "", email: "", password: "" });
  const [store, setStore] = useState({ store_name: "", slug: "", description: "" });
  const [logo, setLogo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function slugify(v: string) {
    return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!isLoggedIn()) {
        await auth.register({ username: account.username, email: account.email, password: account.password });
        await auth.login(account.username, account.password);
      }
      await api.applyVendor({
        store_name: store.store_name,
        slug: store.slug || slugify(store.store_name),
        description: store.description,
        logo: logo || undefined,
      });
      setDone(true);
    } catch {
      setError("Couldn't submit your application — check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="container-shell py-16 max-w-md mx-auto text-center">
        <h1 className="font-display text-2xl font-black mb-3">Application submitted 🎉</h1>
        <p className="text-neutral-600 mb-6">
          We&apos;ll review your store and notify you once it&apos;s approved. You can already sign in to your
          vendor dashboard — it&apos;ll show &ldquo;pending approval&rdquo; until then.
        </p>
        <Link href="/vendor/login" className="btn btn-ink">
          Go to vendor dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="container-shell py-16 max-w-md mx-auto">
      <h1 className="font-display text-2xl font-black mb-1">Become a duka vendor</h1>
      <p className="text-sm text-neutral-500 mb-6">List Women, Kids, Beauty, Maternity, or Home & Lifestyle products to shoppers across Kenya.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {needsAccount && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 pt-2">Your account</p>
            <input
              placeholder="Username"
              value={account.username}
              onChange={(e) => setAccount({ ...account, username: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={account.email}
              onChange={(e) => setAccount({ ...account, email: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={account.password}
              onChange={(e) => setAccount({ ...account, password: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
            />
          </>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 pt-2">Your store</p>
        <input
          placeholder="Store name"
          value={store.store_name}
          onChange={(e) => setStore({ ...store, store_name: e.target.value, slug: slugify(e.target.value) })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        <input
          placeholder="Store URL slug"
          value={store.slug}
          onChange={(e) => setStore({ ...store, slug: slugify(e.target.value) })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        <textarea
          placeholder="Tell shoppers what you sell…"
          value={store.description}
          onChange={(e) => setStore({ ...store, description: e.target.value })}
          rows={3}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        <div>
          <label className="text-sm font-semibold block mb-1">Store logo</label>
          <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>

        {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}

        <button
          disabled={loading}
          className="btn btn-signal btn-block"
        >
          {loading ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </main>
  );
}
