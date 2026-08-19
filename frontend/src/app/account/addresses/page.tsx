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

  function load() {
    setLoading(true);
    api
      .addresses()
      .then((r) => setAddresses(Array.isArray(r) ? r : r.results))
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
      load();
    } catch {
      setError("Couldn't save this address. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this address?")) return;
    await api.deleteAddress(id);
    load();
  }

  async function handleSetDefault(id: number) {
    await api.setDefaultAddress(id);
    load();
  }

  return (
    <main className="container-shell py-10 max-w-2xl">
      <h1 className="font-display text-2xl font-black mb-1">My addresses</h1>
      <p className="text-sm text-neutral-500 mb-6">&nbsp;</p>
      <AccountNav />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {addresses.length === 0 && !showForm && (
              <p className="text-neutral-500">No saved addresses yet — add one to check out faster next time.</p>
            )}
            {addresses.map((a) => (
              <div key={a.id} className="border border-[var(--color-line)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
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
                  <div className="flex flex-col gap-2 shrink-0 text-xs font-semibold uppercase">
                    <button onClick={() => openEdit(a)} className="underline">
                      Edit
                    </button>
                    {!a.is_default && (
                      <button onClick={() => handleSetDefault(a.id)} className="underline">
                        Set default
                      </button>
                    )}
                    <button onClick={() => handleDelete(a.id)} className="underline text-[var(--color-flag)]">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="border border-[var(--color-line)] rounded-xl p-4 space-y-3">
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

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[var(--color-signal)] text-[var(--color-ink)] font-bold uppercase tracking-wide px-6 py-3 rounded-full text-sm disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save address"}
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
