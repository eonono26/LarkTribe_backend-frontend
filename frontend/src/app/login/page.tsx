"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const inputClass =
    "w-full bg-stone-50 border border-stone-200 px-4 py-3 text-sm outline-none focus:border-black transition";

  return (
    <main className="bg-white text-black font-sans min-h-[70vh] pt-20 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-editorial text-3xl mb-1">Sign In</h1>

        <p className="text-sm text-stone-500 mb-8">
          Welcome back to Lark Tribe.
        </p>

        {phoneStep === null && (
          <>
            <p className="text-sm text-stone-500 mb-6">
              Access your wishlist, order history, and saved addresses.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                disabled
                title="Configure Sign in with Apple and POST the identity token to /api/auth/social/"
                className="flex items-center justify-center gap-2 py-3 bg-stone-100 text-xs font-semibold uppercase tracking-wide text-stone-500 opacity-60"
              >
                Apple ID
              </button>

              <button
                type="button"
                disabled
                title="Configure GOOGLE_OAUTH_CLIENT_ID and wire the Google button SDK to POST the id_token to /api/auth/social/"
                className="flex items-center justify-center gap-2 py-3 bg-stone-100 text-xs font-semibold uppercase tracking-wide text-stone-500 opacity-60"
              >
                G Google
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px bg-stone-200 flex-1" />
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">
                Or continue with
              </span>
              <div className="h-px bg-stone-200 flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-stone-500 font-semibold mb-1.5">
                  Account Email or Username
                </label>

                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-stone-500 font-semibold mb-1.5">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className={`${inputClass} pr-11`}
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.6} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.6} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-[var(--color-flag)]">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition disabled:opacity-40"
              >
                {loading ? "Signing in…" : "Continue"}
                {!loading && (
                  <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setPhoneStep("phone")}
              className="w-full mt-3 py-3 border border-stone-200 hover:border-black text-[11px] uppercase tracking-widest text-stone-600 hover:text-black transition"
            >
              Continue with phone number
            </button>

            <div className="mt-6 p-5 bg-stone-50 border border-stone-100 space-y-3">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-stone-700 font-semibold">
                <ShieldCheck className="w-4 h-4" strokeWidth={1.8} />
                Member Privileges
              </span>

              <ul className="text-xs text-stone-600 space-y-1.5">
                <li>
                  Saved wishlist &amp; order tracking across every device
                </li>
                <li>Early access to seasonal drops and private previews</li>
                <li>
                  Faster checkout with saved addresses &amp; payment methods
                </li>
              </ul>
            </div>

            <p className="text-xs text-stone-400 mt-6">
              Demo login: demo_admin / demo1234 (after seed_demo)
            </p>

            <p className="text-center text-xs text-stone-500 mt-6">
              New here?{" "}
              <Link
                href="/register"
                className="underline underline-offset-4 hover:text-black"
              >
                Create an account
              </Link>
            </p>
          </>
        )}

        {phoneStep === "phone" && (
          <form onSubmit={requestOtp} className="space-y-4">
            <p className="text-sm text-stone-500 mb-2">
              We&apos;ll text you a one-time code.
            </p>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className={inputClass}
            />

            {error && (
              <p className="text-sm text-[var(--color-flag)]">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition"
            >
              Send Code
            </button>

            <button
              type="button"
              onClick={() => setPhoneStep(null)}
              className="w-full py-3 text-[11px] uppercase tracking-widest text-stone-500 hover:text-black transition"
            >
              Back
            </button>
          </form>
        )}

        {phoneStep === "code" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-stone-500">
              Enter the 6-digit code sent to {phone}.
            </p>

            {debugCode && (
              <p className="text-xs text-stone-400">
                Dev mode code: {debugCode}
              </p>
            )}

            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={`${inputClass} text-center tracking-[0.5em]`}
            />

            {error && (
              <p className="text-sm text-[var(--color-flag)]">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition"
            >
              Verify &amp; Sign In
            </button>

            <button
              type="button"
              onClick={() => setPhoneStep("phone")}
              className="w-full py-3 text-[11px] uppercase tracking-widest text-stone-500 hover:text-black transition"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </main>
  );
}