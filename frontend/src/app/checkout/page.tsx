"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { api } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import { auth, isLoggedIn } from "@/lib/auth";
import CouponField from "@/components/CouponField";
import type { Address } from "@/lib/types";

type Mode = "member" | "guest";
type Step = "identify" | "details";

export default function CheckoutPage() {
  const { cart, isLoading } = useCart();
  const { formatPrice } = useLocalization();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(isLoggedIn() ? "member" : "guest");
  const [step, setStep] = useState<Step>(isLoggedIn() ? "details" : "identify");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [form, setForm] = useState({
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
    shipping_city: "",
    payment_method: "mpesa",
  });
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  useEffect(() => {
    if (step === "details" && mode === "member" && isLoggedIn()) {
      api
        .addresses()
        .then((r) => {
          const list = Array.isArray(r) ? r : r.results;
          setSavedAddresses(list);
          const def = list.find((a) => a.is_default) || list[0];
          if (def) applyAddress(def);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mode]);

  function applyAddress(a: Address) {
    setSelectedAddressId(a.id);
    setForm((f) => ({
      ...f,
      shipping_name: a.full_name,
      shipping_phone: a.phone,
      shipping_address: a.address_line,
      shipping_city: a.city,
    }));
  }

  async function handleIdentifyContinue() {
    setAuthError("");
    if (mode === "member") {
      try {
        await auth.login(username, password);
        setStep("details");
      } catch {
        setAuthError("Couldn't sign you in — check your username and password.");
      }
    } else {
      if (!email) {
        setAuthError("Enter an email address to continue as guest.");
        return;
      }
      setStep("details");
    }
  }

  async function handlePlaceOrder() {
    setPlacing(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { ...form };
      if (mode === "guest") payload.guest_email = email;
      if (couponCode) payload.coupon_code = couponCode;
      const order = (await api.checkout(payload)) as { order_number: string };
      setOrderNumber(order.order_number);
    } catch {
      setError("Something went wrong placing your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (orderNumber) {
    return (
      <main className="container-shell py-20 text-center max-w-md mx-auto">
        <h1 className="font-display text-3xl font-black mb-3">Order placed 🎉</h1>
        <p className="text-neutral-600 mb-6">
          Your order <span className="font-mono font-bold">{orderNumber}</span> is confirmed. We&apos;ll send updates to{" "}
          {mode === "guest" ? email : "your account"}.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push(`/orders/${orderNumber}`)} className="border border-[var(--color-ink)] px-6 py-3 rounded-full text-sm font-semibold uppercase">
            Track order
          </button>
          <button onClick={() => router.push("/")} className="bg-[var(--color-ink)] text-white px-6 py-3 rounded-full text-sm font-semibold uppercase">
            Continue shopping
          </button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container-shell py-20 text-center">
        <p className="text-neutral-400">Loading your bag…</p>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="container-shell py-20 text-center">
        <p className="text-neutral-500">Your bag is empty.</p>
      </main>
    );
  }

  const total = parseFloat(cart.total) - discount;

  return (
    <main className="container-shell py-10 max-w-lg mx-auto">
      {step === "identify" ? (
        <>
          <h1 className="font-display text-2xl md:text-3xl font-black text-center mb-8">
            How would you like to checkout?
          </h1>

          <div className="flex bg-[var(--color-mist)] rounded-full p-1 mb-6">
            <button
              onClick={() => setMode("member")}
              className={`flex-1 py-3 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors ${
                mode === "member" ? "bg-[var(--color-ink)] text-white" : "text-neutral-500"
              }`}
            >
              Member login
            </button>
            <button
              onClick={() => setMode("guest")}
              className={`flex-1 py-3 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors ${
                mode === "guest" ? "bg-[var(--color-ink)] text-white" : "text-neutral-500"
              }`}
            >
              Guest checkout
            </button>
          </div>

          {mode === "member" ? (
            <div className="space-y-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-4 outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-4 outline-none"
              />
              <p className="text-sm text-neutral-500">
                No account yet? <a href="/register" className="underline font-semibold">Register</a>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-4 outline-none"
              />
              <p className="text-sm text-neutral-500">Checkout quickly as a guest (you can create an account later if you wish).</p>
            </div>
          )}

          {authError && <p className="text-sm text-[var(--color-flag)] mt-3">{authError}</p>}

          <button
            onClick={handleIdentifyContinue}
            className="w-full bg-[var(--color-signal)] text-[var(--color-ink)] font-bold uppercase tracking-wide py-4 rounded-full mt-6"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-black mb-6">Delivery & payment</h1>

          {mode === "member" && savedAddresses.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold mb-2">Deliver to</p>
              <div className="space-y-2">
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => applyAddress(a)}
                    className={`w-full text-left border rounded-lg px-4 py-3 text-sm ${
                      selectedAddressId === a.id
                        ? "border-[var(--color-ink)] bg-[var(--color-mist)]"
                        : "border-[var(--color-line)]"
                    }`}
                  >
                    <span className="font-semibold uppercase text-xs mr-2">{a.label}</span>
                    {a.full_name} — {a.address_line}, {a.city}
                  </button>
                ))}
              </div>
              <a href="/account/addresses" className="text-xs underline text-neutral-500 mt-2 inline-block">
                Manage addresses
              </a>
            </div>
          )}

          <div className="space-y-3">
            <input
              placeholder="Full name"
              value={form.shipping_name}
              onChange={(e) => setForm({ ...form, shipping_name: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
            />
            <input
              placeholder="Phone number (for M-Pesa & delivery)"
              value={form.shipping_phone}
              onChange={(e) => setForm({ ...form, shipping_phone: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
            />
            <input
              placeholder="Delivery address"
              value={form.shipping_address}
              onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
            />
            <input
              placeholder="Town / City"
              value={form.shipping_city}
              onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
            />

            <div>
              <p className="text-sm font-semibold mb-2 mt-4">Payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "mpesa", label: "M-Pesa" },
                  { value: "card", label: "Card" },
                  { value: "cod", label: "Cash on delivery" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, payment_method: opt.value })}
                    className={`border rounded-lg py-3 text-xs font-semibold uppercase ${
                      form.payment_method === opt.value
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                        : "border-[var(--color-line)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <CouponField subtotal={parseFloat(cart.total)} onApplied={(code, d) => { setCouponCode(code); setDiscount(d); }} />
          </div>

          <div className="mt-6 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[var(--dept-maternity)]">
                <span>Coupon discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{formatPrice(total)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-[var(--color-flag)] mt-2">{error}</p>}

          <button
            onClick={handlePlaceOrder}
            disabled={placing || !form.shipping_name || !form.shipping_phone || !form.shipping_address}
            className="w-full bg-[var(--color-signal)] text-[var(--color-ink)] font-bold uppercase tracking-wide py-4 rounded-full mt-6 disabled:opacity-40"
          >
            {placing ? "Placing order…" : "Place order"}
          </button>
        </>
      )}
    </main>
  );
}
