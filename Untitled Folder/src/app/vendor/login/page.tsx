"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { vendorApi, setToken } from "@/lib/vendor-api";

export default function VendorLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await vendorApi.login(username, password);
      setToken(res.access);
      router.push("/vendor/dashboard");
    } catch {
      setError("Couldn't sign you in — check your username and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-shell py-16 max-w-sm mx-auto">
      <h1 className="font-display text-2xl font-black mb-1">Vendor sign in</h1>
      <p className="text-sm text-neutral-500 mb-6">Manage your products and orders on duka.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
        />
        {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
        <button
          disabled={loading}
          className="btn btn-ink btn-block"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-xs text-neutral-500 mt-4">
        Not a vendor yet? Apply via <code>/api/vendors/apply/</code> (vendor application UI is next on the roadmap).
      </p>
      <p className="text-xs text-neutral-400 mt-2">Demo login: demo_vendor / demo1234 (after running seed_demo)</p>
    </main>
  );
}
