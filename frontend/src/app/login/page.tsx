"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [phoneStep, setPhoneStep] = useState<"phone" | "code" | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await auth.login(username, password);
      router.push("/");
    } catch {
      setError("Couldn't sign you in — check your username and password.");
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await auth.requestPhoneOTP(phone);
      setPhoneStep("code");
      if (res.debug_code) setDebugCode(res.debug_code);
    } catch {
      setError("Couldn't send a code to that number.");
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await auth.verifyPhoneOTP(phone, code);
      router.push("/");
    } catch {
      setError("Invalid or expired code.");
    }
  }

  return (
    <main className="container-shell py-16 max-w-sm mx-auto">
      <h1 className="font-display text-2xl font-black mb-1">Sign in</h1>
      <p className="text-sm text-neutral-500 mb-6">Welcome back to duka.</p>

      {phoneStep === null && (
        <>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username or email"
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
              className="w-full bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide py-3.5 rounded-full disabled:opacity-40"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-[var(--color-line)] flex-1" />
            <span className="text-xs text-neutral-400 uppercase">or</span>
            <div className="h-px bg-[var(--color-line)] flex-1" />
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setPhoneStep("phone")}
              className="w-full border border-[var(--color-line)] rounded-full py-3 text-sm font-semibold"
            >
              Continue with phone number
            </button>
            <button
              disabled
              title="Configure GOOGLE_OAUTH_CLIENT_ID and wire the Google button SDK to POST the id_token to /api/auth/social/"
              className="w-full border border-[var(--color-line)] rounded-full py-3 text-sm font-semibold opacity-50"
            >
              Continue with Google
            </button>
            <button
              disabled
              title="Configure Sign in with Apple and POST the identity token to /api/auth/social/"
              className="w-full border border-[var(--color-line)] rounded-full py-3 text-sm font-semibold opacity-50"
            >
              Continue with Apple
            </button>
          </div>

          <p className="text-sm text-neutral-500 mt-6">
            New here? <Link href="/register" className="underline font-semibold">Create an account</Link>
          </p>
          <p className="text-xs text-neutral-400 mt-2">Demo login: demo_admin / demo1234 (superuser, after seed_demo)</p>
        </>
      )}

      {phoneStep === "phone" && (
        <form onSubmit={requestOtp} className="space-y-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254 7XX XXX XXX"
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
          />
          {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
          <button className="w-full bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide py-3.5 rounded-full">
            Send code
          </button>
          <button type="button" onClick={() => setPhoneStep(null)} className="w-full text-sm underline">
            Back
          </button>
        </form>
      )}

      {phoneStep === "code" && (
        <form onSubmit={verifyOtp} className="space-y-3">
          <p className="text-sm text-neutral-500">Enter the 6-digit code sent to {phone}.</p>
          {debugCode && <p className="text-xs text-neutral-400">Dev mode code: {debugCode}</p>}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none text-center tracking-[0.5em]"
          />
          {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
          <button className="w-full bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide py-3.5 rounded-full">
            Verify & sign in
          </button>
        </form>
      )}
    </main>
  );
}
