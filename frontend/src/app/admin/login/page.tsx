"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export default function AdminLoginPage() {
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
      await auth.login(username, password);
      const me = await auth.me();
      if (me.role !== "admin") {
        setError("This account doesn't have admin access.");
        return;
      }
      router.push("/admin");
    } catch {
      setError("Couldn't sign you in — check your username and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-shell py-16 max-w-sm mx-auto">
      <h1 className="font-display text-2xl font-black mb-1">Admin sign in</h1>
      <p className="text-sm text-neutral-500 mb-6">Platform administration for duka.</p>
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
      <p className="text-xs text-neutral-400 mt-4">Demo login: demo_admin / demo1234 (after seed_demo)</p>
    </main>
  );
}
