"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { PaymentMethod } from "@/lib/types";

type FormState = {
  type: "card" | "mpesa";
  label: string;
  card_brand: string;
  card_number: string;
  card_exp_month: string;
  card_exp_year: string;
  mpesa_phone: string;
};

const EMPTY_FORM: FormState = {
  type: "mpesa",
  label: "",
  card_brand: "Visa",
  card_number: "",
  card_exp_month: "",
  card_exp_year: "",
  mpesa_phone: "",
};

export default function PaymentMethodsPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function load() {
    api
      .paymentMethods()
      .then((r) => setMethods(Array.isArray(r) ? r : r.results))
      .catch(() => setLoadError("We couldn't load your payment methods. Please try again."))
      .finally(() => setLoading(false));
  }

  function retryLoad() {
    setLoading(true);
    setLoadError("");
    load();
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.type === "mpesa" && !form.mpesa_phone) {
      setError("Enter the M-Pesa phone number.");
      return;
    }
    if (form.type === "card" && form.card_number.replace(/\s/g, "").length < 4) {
      setError("Enter a valid card number.");
      return;
    }
    setSaving(true);
    try {
      if (form.type === "mpesa") {
        await api.createPaymentMethod({ type: "mpesa", mpesa_phone: form.mpesa_phone, label: form.label });
      } else {
        const digits = form.card_number.replace(/\s/g, "");
        await api.createPaymentMethod({
          type: "card",
          card_brand: form.card_brand,
          card_last4: digits.slice(-4),
          card_exp_month: form.card_exp_month ? Number(form.card_exp_month) : null,
          card_exp_year: form.card_exp_year ? Number(form.card_exp_year) : null,
          label: form.label,
        });
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      retryLoad();
    } catch {
      setError("Couldn't save this payment method. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this payment method?")) return;
    try {
      await api.deletePaymentMethod(id);
      retryLoad();
    } catch {
      setError("Couldn't remove this payment method. Please try again.");
    }
  }

  async function handleSetDefault(id: number) {
    try {
      await api.setDefaultPaymentMethod(id);
      retryLoad();
    } catch {
      setError("Couldn't update your default payment method. Please try again.");
    }
  }

  return (
    <main className="account-page">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Your account</span>
      <h1 className="text-[13px] tracking-[0.08em] mb-2 font-editorial ">Payment methods</h1>
      <p className="mb-6 text-sm text-neutral-500">Manage your saved M-Pesa numbers and card references securely.</p>
      <AccountNav />
      {error && !showForm && <p role="alert" className="mb-4 text-sm text-[var(--color-flag)]">{error}</p>}

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : loadError ? (
        <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{loadError}</p>
          <button onClick={retryLoad} className="mt-2 font-semibold underline">Try again</button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {methods.length === 0 && !showForm && (
              <p className="text-neutral-500">No saved payment methods yet.</p>
            )}
            {methods.map((m) => (
              <div key={m.id} className="flex flex-col gap-4 border border-stone-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide bg-[var(--color-mist)] px-2 py-0.5 rounded-none">
                      {m.type === "card" ? m.card_brand || "Card" : "M-Pesa"}
                    </span>
                    {m.is_default && (
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-signal)]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="font-semibold">
                    {m.type === "card" ? `•••• •••• •••• ${m.card_last4}` : m.mpesa_phone}
                  </p>
                  {m.type === "card" && m.card_exp_month && m.card_exp_year && (
                    <p className="text-sm text-neutral-600">
                      Expires {String(m.card_exp_month).padStart(2, "0")}/{m.card_exp_year}
                    </p>
                  )}
                  {m.label && <p className="text-sm text-neutral-500">{m.label}</p>}
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase sm:flex-col sm:gap-2">
                  {!m.is_default && (
                    <button onClick={() => handleSetDefault(m.id)} className="min-h-8 underline underline-offset-2">
                      Set default
                    </button>
                  )}
                  <button onClick={() => handleDelete(m.id)} className="min-h-8 underline text-[var(--color-flag)] underline-offset-2">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="max-w-3xl space-y-3 border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="grid grid-cols-2 gap-2">
                {(["mpesa", "card"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...EMPTY_FORM, type: t })}
                    className={`border rounded-none py-2.5 text-xs font-semibold uppercase ${
 form.type === t
 ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
 : "border-[var(--color-line)]"
 }`}
                  >
                    {t === "mpesa" ? "M-Pesa" : "Card"}
                  </button>
                ))}
              </div>

              {form.type === "mpesa" ? (
                <input
                  placeholder="M-Pesa phone number"
                  value={form.mpesa_phone}
                  onChange={(e) => setForm({ ...form, mpesa_phone: e.target.value })}
                  className="w-full bg-[var(--color-mist)] rounded-none px-4 py-3.5 outline-none"
                />
              ) : (
                <>
                  <select
                    value={form.card_brand}
                    onChange={(e) => setForm({ ...form, card_brand: e.target.value })}
                    className="w-full bg-[var(--color-mist)] rounded-none px-4 py-3.5 outline-none"
                  >
                    <option>Visa</option>
                    <option>Mastercard</option>
                  </select>
                  <input
                    placeholder="Card number"
                    value={form.card_number}
                    onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                    className="w-full min-w-0 bg-[var(--color-mist)] rounded-none px-4 py-3.5 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Exp. month (MM)"
                      value={form.card_exp_month}
                      onChange={(e) => setForm({ ...form, card_exp_month: e.target.value })}
                      className="w-full bg-[var(--color-mist)] rounded-none px-4 py-3.5 outline-none"
                    />
                    <input
                      placeholder="Exp. year (YYYY)"
                      value={form.card_exp_year}
                      onChange={(e) => setForm({ ...form, card_exp_year: e.target.value })}
                      className="w-full bg-[var(--color-mist)] rounded-none px-4 py-3.5 outline-none"
                    />
                  </div>
                  <p className="text-xs text-neutral-500">
                    For your security we only store the card brand and last 4 digits — never the full number or CVV.
                  </p>
                </>
              )}

              <input
                placeholder="Label (optional, e.g. Personal)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full bg-[var(--color-mist)] rounded-none px-4 py-3.5 outline-none"
              />

              {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-signal btn-sm"
                >
                  {saving ? "Saving…" : "Save payment method"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="min-h-12 border border-[var(--color-ink)] px-6 py-3 text-sm font-semibold uppercase transition hover:bg-black hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setError("");
                setShowForm(true);
              }}
              className="min-h-12 border border-[var(--color-ink)] px-6 py-3 text-sm font-semibold uppercase transition hover:bg-black hover:text-white"
            >
              + Add payment method
            </button>
          )}
        </>
      )}
    </main>
  );
}
