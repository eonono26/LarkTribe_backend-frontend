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

  function load() {
    setLoading(true);
    api
      .paymentMethods()
      .then((r) => setMethods(Array.isArray(r) ? r : r.results))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      load();
    } catch {
      setError("Couldn't save this payment method. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this payment method?")) return;
    await api.deletePaymentMethod(id);
    load();
  }

  async function handleSetDefault(id: number) {
    await api.setDefaultPaymentMethod(id);
    load();
  }

  return (
    <main className="container-shell py-10 max-w-2xl">
      <h1 className="font-display text-2xl font-black mb-1">Payment methods</h1>
      <p className="text-sm text-neutral-500 mb-6">&nbsp;</p>
      <AccountNav />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {methods.length === 0 && !showForm && (
              <p className="text-neutral-500">No saved payment methods yet.</p>
            )}
            {methods.map((m) => (
              <div key={m.id} className="border border-[var(--color-line)] rounded-xl p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide bg-[var(--color-mist)] px-2 py-0.5 rounded-full">
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
                <div className="flex flex-col gap-2 shrink-0 text-xs font-semibold uppercase">
                  {!m.is_default && (
                    <button onClick={() => handleSetDefault(m.id)} className="underline">
                      Set default
                    </button>
                  )}
                  <button onClick={() => handleDelete(m.id)} className="underline text-[var(--color-flag)]">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="border border-[var(--color-line)] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["mpesa", "card"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...EMPTY_FORM, type: t })}
                    className={`border rounded-lg py-2.5 text-xs font-semibold uppercase ${
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
                  className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
                />
              ) : (
                <>
                  <select
                    value={form.card_brand}
                    onChange={(e) => setForm({ ...form, card_brand: e.target.value })}
                    className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
                  >
                    <option>Visa</option>
                    <option>Mastercard</option>
                  </select>
                  <input
                    placeholder="Card number"
                    value={form.card_number}
                    onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                    className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Exp. month (MM)"
                      value={form.card_exp_month}
                      onChange={(e) => setForm({ ...form, card_exp_month: e.target.value })}
                      className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
                    />
                    <input
                      placeholder="Exp. year (YYYY)"
                      value={form.card_exp_year}
                      onChange={(e) => setForm({ ...form, card_exp_year: e.target.value })}
                      className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
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
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
              />

              {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[var(--color-signal)] text-[var(--color-ink)] font-bold uppercase tracking-wide px-6 py-3 rounded-full text-sm disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save payment method"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-[var(--color-ink)] px-6 py-3 rounded-full text-sm font-semibold uppercase"
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
              className="border border-[var(--color-ink)] px-6 py-3 rounded-full text-sm font-semibold uppercase"
            >
              + Add payment method
            </button>
          )}
        </>
      )}
    </main>
  );
}
