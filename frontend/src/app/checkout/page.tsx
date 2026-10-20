"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { api, apiErrorMessage, mediaUrl } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import { auth, isLoggedIn } from "@/lib/auth";
import CouponField from "@/components/CouponField";
import VariantBadge from "@/components/VariantBadge";
import { Smartphone, CreditCard, Banknote } from "lucide-react";

const MEMBER_DISCOUNT_PERCENT = 5;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: cartLoading, refreshCart } = useCart();
  const { formatPrice } = useLocalization();

  const [step, setStep] = useState<"auth" | "delivery">("auth");
  const [mode, setMode] = useState<"guest" | "member">("guest");
  const [memberTab, setMemberTab] = useState<"login" | "register">("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newAccount, setNewAccount] = useState({ first_name: "", last_name: "", username: "", email: "", password: "" });
  const [email, setEmail] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [form, setForm] = useState({
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
    shipping_city: "",
    payment_method: "mpesa",
  });

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      setMode("member");
      setStep("delivery");
      auth.me().then(u => {
        setForm(f => ({ ...f, shipping_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(), shipping_phone: u.phone || "" }));
      }).catch(() => {});
      api.addresses().then(r => setSavedAddresses(r.results || [])).catch(() => {});
    }
  }, []);

  if (cartLoading) {
    return <main className="bg-white min-h-[60vh] flex items-center justify-center"><p className="text-sm text-stone-400">Loading your bag…</p></main>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="bg-white min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-editorial text-2xl mb-2">Your bag is empty</h1>
          <Link href="/shop" className="text-[11px] uppercase tracking-widest underline">Continue Shopping</Link>
        </div>
      </main>
    );
  }

  const subtotal = parseFloat(cart.total) || 0;
  const memberDiscount = mode === "member" ? Math.round(subtotal * MEMBER_DISCOUNT_PERCENT / 100) : 0;
  const shippingFee = subtotal > 5000 ? 0 : 250;
  const total = Math.max(0, subtotal - discount - memberDiscount + shippingFee);
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  async function handleIdentifyContinue() {
    setAuthError(""); setAuthBusy(true);
    try {
      if (mode === "member") {
        if (memberTab === "login") {
          await auth.login({ username, password });
        } else {
          await auth.register(newAccount);
          await auth.login({ username: newAccount.username, password: newAccount.password });
        }
        setStep("delivery");
        const u = await auth.me();
        setForm(f => ({ ...f, shipping_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(), shipping_phone: u.phone || "" }));
        const addr = await api.addresses();
        setSavedAddresses(addr.results || []);
      } else {
        if (!email) { setAuthError("Enter your email"); setAuthBusy(false); return; }
        setStep("delivery");
      }
    } catch (e: any) {
      setAuthError(apiErrorMessage(e, "Authentication failed."));
    } finally {
      setAuthBusy(false);
    }
  }

  function applyAddress(a: any) {
    setSelectedAddressId(a.id);
    setForm(f => ({ ...f, shipping_name: a.full_name, shipping_phone: a.phone, shipping_address: a.address_line, shipping_city: a.city }));
  }

  async function handlePlaceOrder() {
    setError("");
    if (!form.shipping_name || !form.shipping_phone || !form.shipping_address) {
      setError("Please fill in all delivery fields."); return;
    }
    setPlacing(true);
    try {
      const payload: any = {
        shipping_name: form.shipping_name,
        shipping_phone: form.shipping_phone,
        shipping_address: form.shipping_address,
        shipping_city: form.shipping_city,
        payment_method: form.payment_method,
        coupon_code: couponCode || undefined,
      };
      if (mode === "guest") payload.guest_email = email;
      const order = await api.checkout(payload);
      await refreshCart();
      router.push(`/orders/${order.order_number}`);
    } catch (e: any) {
      setError(apiErrorMessage(e, "Could not place order."));
    } finally {
      setPlacing(false);
    }
  }

  const inputClass = "w-full bg-stone-50 border border-stone-200 px-4 py-3 text-sm outline-none focus:border-black transition";

  return (
    <main className="bg-white text-black font-sans min-h-screen">
      <div className="container-shell py-10 lg:py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left — form */}
          <div className="lg:col-span-7">
            {step === "auth" ? (
              <>
                <h1 className="font-editorial text-3xl mb-8">Checkout</h1>
                <div className="flex gap-6 mb-6 text-sm">
                  <button onClick={() => setMode("guest")} className={`pb-1 border-b-2 ${mode === "guest" ? "border-black font-medium" : "border-transparent text-stone-500"}`}>Guest</button>
                  <button onClick={() => setMode("member")} className={`pb-1 border-b-2 ${mode === "member" ? "border-black font-medium" : "border-transparent text-stone-500"}`}>Member</button>
                </div>

                {mode === "member" ? (
                  <div className="space-y-3">
                    <div className="flex gap-4 text-sm mb-2">
                      <button onClick={() => setMemberTab("login")} className={memberTab === "login" ? "font-medium" : "text-stone-500"}>Sign In</button>
                      <button onClick={() => setMemberTab("register")} className={memberTab === "register" ? "font-medium" : "text-stone-500"}>Create Account</button>
                    </div>
                    {memberTab === "login" ? (
                      <>
                        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className={inputClass} />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={inputClass} />
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <input value={newAccount.first_name} onChange={e => setNewAccount({ ...newAccount, first_name: e.target.value })} placeholder="First name" className={inputClass} />
                          <input value={newAccount.last_name} onChange={e => setNewAccount({ ...newAccount, last_name: e.target.value })} placeholder="Last name" className={inputClass} />
                        </div>
                        <input value={newAccount.username} onChange={e => setNewAccount({ ...newAccount, username: e.target.value })} placeholder="Username" className={inputClass} />
                        <input type="email" value={newAccount.email} onChange={e => setNewAccount({ ...newAccount, email: e.target.value })} placeholder="Email" className={inputClass} />
                        <input type="password" value={newAccount.password} onChange={e => setNewAccount({ ...newAccount, password: e.target.value })} placeholder="Password" className={inputClass} />
                        <p className="text-xs text-stone-500">{MEMBER_DISCOUNT_PERCENT}% member discount applied automatically.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
                )}

                {authError && <p className="text-sm text-red-700 mt-3">{authError}</p>}
                <button onClick={handleIdentifyContinue} disabled={authBusy} className="w-full mt-6 py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition disabled:opacity-40">
                  {authBusy ? "Please wait…" : "Continue"}
                </button>
              </>
            ) : (
              <>
                <h1 className="font-editorial text-3xl mb-8">Delivery & Payment</h1>

                {mode === "member" && savedAddresses.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">Saved Addresses</p>
                    {savedAddresses.map(a => (
                      <button key={a.id} onClick={() => applyAddress(a)} className={`w-full text-left border px-4 py-3 text-sm transition ${selectedAddressId === a.id ? "border-black bg-stone-50" : "border-stone-200"}`}>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500 mr-2">{a.label}</span>
                        {a.full_name} — {a.address_line}, {a.city}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <input placeholder="Full name" value={form.shipping_name} onChange={e => setForm({ ...form, shipping_name: e.target.value })} className={inputClass} />
                  <input placeholder="Phone number" value={form.shipping_phone} onChange={e => setForm({ ...form, shipping_phone: e.target.value })} className={inputClass} />
                  <input placeholder="Delivery address" value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })} className={inputClass} />
                  <input placeholder="Town / City" value={form.shipping_city} onChange={e => setForm({ ...form, shipping_city: e.target.value })} className={inputClass} />
                  <CouponField subtotal={subtotal} onApplied={(code, d) => { setCouponCode(code); setDiscount(d); }} />
                </div>

                <div className="mt-8">
                  <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium mb-3">Payment</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "mpesa", label: "M-Pesa", icon: Smartphone },
                      { value: "card", label: "Card", icon: CreditCard },
                      { value: "cod", label: "Cash", icon: Banknote },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = form.payment_method === opt.value;
                      return (
                        <button key={opt.value} onClick={() => setForm({ ...form, payment_method: opt.value })} className={`flex flex-col items-center gap-1.5 border py-3 text-[11px] font-medium uppercase tracking-wide transition ${active ? "border-black bg-black text-white" : "border-stone-200 hover:border-stone-400"}`}>
                          <Icon size={18} strokeWidth={1.5} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="text-sm text-red-700 mt-4">{error}</p>}

                <button onClick={handlePlaceOrder} disabled={placing || !form.shipping_name || !form.shipping_phone || !form.shipping_address} className="w-full mt-8 py-4 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition disabled:opacity-40">
                  {placing ? "Placing Order…" : `Place Order — ${formatPrice(total)}`}
                </button>
              </>
            )}
          </div>

          {/* Right — summary */}
          <div className="lg:col-span-5">
            <div className="bg-stone-50 border border-stone-200 p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-stone-200">
                <h2 className="font-editorial text-lg">Order Summary</h2>
                <span className="text-xs text-stone-500">{itemCount} Item{itemCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {cart.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative shrink-0 w-14 h-16 bg-stone-100 overflow-hidden">
                      {item.image || item.product.image ? (
                        <Image src={mediaUrl(item.image || item.product.image)} alt={item.product.name} fill className="object-cover" sizes="56px" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      {item.variant && <VariantBadge color={item.variant.color} size={item.variant.size} />}
                      <p className="text-xs text-stone-400">Qty {item.quantity}</p>
                    </div>
                    <span className="text-sm shrink-0">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-stone-200 space-y-2 text-sm">
                <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>{formatPrice(cart.total)}</span></div>
                {discount > 0 && <div className="flex justify-between text-stone-600"><span>Coupon</span><span>-{formatPrice(discount)}</span></div>}
                {memberDiscount > 0 && <div className="flex justify-between text-stone-600"><span>Member Discount</span><span>-{formatPrice(memberDiscount)}</span></div>}
                <div className="flex justify-between text-stone-500"><span>Delivery</span><span>{shippingFee === 0 ? "Complimentary" : formatPrice(shippingFee)}</span></div>
                <div className="flex justify-between items-baseline pt-3 border-t border-stone-200 font-medium text-lg">
                  <span className="font-editorial">Total</span>
                  <span className="font-editorial">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}