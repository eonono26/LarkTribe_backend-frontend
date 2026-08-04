"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { vendorApi } from "@/lib/vendor-api";

interface CategoryOption {
  id: number;
  name: string;
  department: { name: string };
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    compare_at_price: "",
    stock: "0",
    sku: "",
    category: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    vendorApi.categories().then((r) => setCategories(r.results));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const product = await vendorApi.createProduct({
        name: form.name,
        description: form.description,
        price: form.price,
        compare_at_price: form.compare_at_price || null,
        stock: parseInt(form.stock, 10),
        sku: form.sku,
        category: parseInt(form.category, 10),
      });
      for (let i = 0; i < images.length; i++) {
        await vendorApi.uploadProductImage(product.id, images[i], i === 0);
      }
      router.push("/vendor/dashboard/products");
    } catch {
      setError("Couldn't save this product — check the fields (SKU must be unique) and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="font-display text-lg font-bold mb-4">Add a product</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Product name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          rows={3}
        />
        <select
          required
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.department.name} / {c.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Price (KSh)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
          <input
            placeholder="Compare-at price (optional)"
            type="number"
            value={form.compare_at_price}
            onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Stock quantity"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
          <input
            required
            placeholder="SKU (unique)"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-semibold block mb-1">Product photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
          <p className="text-xs text-neutral-400 mt-1">The first photo becomes the primary listing image.</p>
        </div>

        {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
        <button
          disabled={saving}
          className="bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide px-6 py-3 rounded-full disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save product"}
        </button>
      </form>
    </div>
  );
}
