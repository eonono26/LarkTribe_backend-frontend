"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountNav from "@/components/AccountNav";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Address } from "@/lib/types";

const EMPTY_FORM = {
  label: "home" as Address["label"],
  full_name: "",
  phone: "",
  address_line: "",
  city: "",
  is_default: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function load() {
    api
      .addresses()
      .then((r) => setAddresses(Array.isArray(r) ? r : r.results))
      .catch(() => setLoadError("We couldn't load your saved addresses. Please try again."))
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

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(a: Address) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      full_name: a.full_name,
      phone: a.phone,
      address_line: a.address_line,
      city: a.city,
      is_default: a.is_default,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.address_line || !form.city) {
      setError("Please fill in every field.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await api.updateAddress(editingId, form);
      } else {
        await api.createAddress(form);
      }
      setShowForm(false);
      retryLoad();
    } catch {
      setError("Couldn't save this address. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this address?")) return;
    try {
      await api.deleteAddress(id);
      retryLoad();
    } catch {
      setError("Couldn't remove this address. Please try again.");
    }
  }

  async function handleSetDefault(id: number) {
    try {
      await api.setDefaultAddress(id);
      retryLoad();
    } catch {
      setError("Couldn't update your default address. Please try again.");
    }
  }

  return (
    <main className="account-page">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Your account</span>
      <h1 className="mb-2 font-editorial text-3xl sm:text-4xl">Saved addresses</h1>
      <p className="mb-6 text-sm text-neutral-500">Keep delivery details ready for a faster checkout.</p>
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
            {addresses.length === 0 && !showForm && (
              <p className="text-neutral-500">No saved addresses yet — add one to check out faster next time.</p>
            )}
            {addresses.map((a) => (
              <div key={a.id} className="border border-stone-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide bg-[var(--color-mist)] px-2 py-0.5 rounded-full">
                        {a.label}
                      </span>
                      {a.is_default && (
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-signal)]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-semibold">{a.full_name}</p>
                    <p className="text-sm text-neutral-600">{a.phone}</p>
                    <p className="text-sm text-neutral-600">
                      {a.address_line}, {a.city}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase sm:flex-col sm:gap-2">
                    <button onClick={() => openEdit(a)} className="min-h-8 underline underline-offset-2">
                      Edit
                    </button>
                    {!a.is_default && (
                      <button onClick={() => handleSetDefault(a.id)} className="min-h-8 underline underline-offset-2">
                        Set default
                      </button>
                    )}
                    <button onClick={() => handleDelete(a.id)} className="min-h-8 underline text-[var(--color-flag)] underline-offset-2">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="max-w-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-3 sm:p-6">
              <div className="grid grid-cols-3 gap-2">
                {(["home", "work", "other"] as const).map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => setForm({ ...form, label: l })}
                    className={`border rounded-lg py-2.5 text-xs font-semibold uppercase ${
                      form.label === l
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                        : "border-[var(--color-line)]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <input
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
              />
              <input
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
              />
              <input
                placeholder="Delivery address"
                value={form.address_line}
                onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
              />
              <input
                placeholder="Town / City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3.5 outline-none"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                />
                Set as default address
              </label>

              {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-signal btn-sm"
                >
                  {saving ? "Saving…" : "Save address"}
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
              onClick={openNew}
              className="border border-[var(--color-ink)] px-6 py-3 rounded-full text-sm font-semibold uppercase"
            >
              + Add new address
            </button>
          )}
        </>
      )}
    </main>
  );
}
