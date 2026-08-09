"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, isLoggedIn, type AuthUser } from "@/lib/auth";
import AccountNav from "@/components/AccountNav";

export default function AccountProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    auth
      .me()
      .then((u) => {
        setUser(u);
        setForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone });
      })
      .catch(() => setError("Couldn't load your profile."))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const updated = await auth.updateMe(form);
      setUser(updated);
      setSaved(true);
    } catch {
      setError("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    auth.logout();
    router.push("/");
  }

  return (
    <main className="container-shell py-10 max-w-2xl">
      <h1 className="font-display text-2xl font-black mb-1">My account</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {user ? `@${user.username}` : "\u00A0"}
      </p>
      <AccountNav />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
            />
            <input
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
            />
          </div>
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
          <input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />

          {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
          {saved && <p className="text-sm text-green-700">Saved.</p>}

          <div className="flex items-center gap-4 pt-2">
            <button
              disabled={saving}
              className="bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide px-6 py-3 rounded-full disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-semibold text-neutral-500 hover:text-[var(--color-flag)]"
            >
              Log out
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
