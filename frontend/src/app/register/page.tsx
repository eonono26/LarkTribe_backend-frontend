"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";

const inputClass =
  "w-full bg-stone-50 border border-stone-200 px-4 py-3 text-sm outline-none focus:border-black transition";

const labelClass =
  "block text-[10px] uppercase tracking-widest text-stone-500 font-semibold mb-1.5";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
  });

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
      setError(
        "Couldn't create your account — check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-white text-black font-sans min-h-[70vh] pt-20 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-editorial text-3xl mb-1">Create Account</h1>

        <p className="text-sm text-stone-500 mb-8">
          Join Lark Tribe for faster checkout and easier shopping.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First Name</label>
              <input
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Last Name</label>
              <input
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Username</label>
            <input
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Phone (for delivery updates)
            </label>
            <input
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
              placeholder="+254 7XX XXX XXX"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-flag)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition disabled:opacity-40"
          >
            {loading ? "Creating account…" : "Create Account"}
            {!loading && (
              <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
            )}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-black"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}