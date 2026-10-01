"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { vendorApi, VendorProduct, VendorProductImage, VendorAgeGroup } from "@/lib/vendor-api";
import { mediaUrl } from "@/lib/api";

interface CategoryOption {
  id: number;
  name: string;
  department: { name: string };
}

const GENDER_OPTIONS = [
  { value: "unisex", label: "Unisex" },
  { value: "girls", label: "Girls" },
  { value: "boys", label: "Boys" },
] as const;

export default function EditProductPage() {
  const params = useParams();
  const productId = Number(params.id);
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [ageGroups, setAgeGroups] = useState<VendorAgeGroup[]>([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<number[]>([]);
  const [images, setImages] = useState<VendorProductImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [form, setForm] = useState<Partial<VendorProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    vendorApi.categories().then((r) => setCategories(r.results));
    vendorApi.ageGroups().then(setAgeGroups).catch(() => setAgeGroups([]));
    vendorApi
      .myProducts()
      .then((r) => {
        const list = Array.isArray(r) ? r : r.results;
        const product = list.find((p) => p.id === productId);
        if (product) {
          setForm(product);
          setImages(product.images ?? []);
          setSelectedAgeGroups(
            Array.isArray(product.age_groups)
              ? product.age_groups.map((ag: any) => (typeof ag === "number" ? ag : ag.id))
              : []
          );
        }
      })
      .finally(() => setLoading(false));
  }, [productId]);

  function toggleAgeGroup(id: number) {
    setSelectedAgeGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      await vendorApi.updateProduct(productId, {
        name: form.name,
        description: form.description,
        price: form.price,
        compare_at_price: form.compare_at_price || null,
        stock: form.stock,
        sku: form.sku,
        category: form.category,
        gender: form.gender,
        age_groups: selectedAgeGroups,
      });
      for (let i = 0; i < newImages.length; i++) {
        await vendorApi.uploadProductImage(productId, newImages[i], images.length === 0 && i === 0);
      }
      router.push("/vendor/dashboard/products");
    } catch {
      setError("Couldn't save changes — check the fields (SKU must be unique) and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    try {
      await vendorApi.deleteProductImage(productId, imageId);
      setImages((imgs) => imgs.filter((i) => i.id !== imageId));
    } catch {
      // ignore
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (!form) return <p className="text-sm text-neutral-500">Product not found.</p>;

  return (
    <div className="max-w-lg">
      <h2 className="font-display text-lg font-bold mb-4">Edit product</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Product name"
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
        />
        <textarea
          placeholder="Description"
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          rows={3}
        />
        <select
          required
          value={form.category ?? ""}
          onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}
          className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.department.name} / {c.name}
            </option>
          ))}
        </select>

        <div>
          <label className="text-sm font-semibold block mb-1">Gender</label>
          <select
            value={form.gender ?? "unisex"}
            onChange={(e) => setForm({ ...form, gender: e.target.value as VendorProduct["gender"] })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          >
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {ageGroups.length > 0 && (
          <div>
            <label className="text-sm font-semibold block mb-1">Age groups</label>
            <div className="flex flex-wrap gap-2">
              {ageGroups.map((ag) => (
                <button
                  type="button"
                  key={ag.id}
                  onClick={() => toggleAgeGroup(ag.id)}
                  className={`border rounded-full px-3 py-1.5 text-xs font-semibold ${
                    selectedAgeGroups.includes(ag.id)
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                      : "border-[var(--color-line)]"
                  }`}
                >
                  {ag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Price (KSh)"
            type="number"
            value={form.price ?? ""}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
          <input
            placeholder="Compare-at price (optional)"
            type="number"
            value={form.compare_at_price ?? ""}
            onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Stock quantity"
            type="number"
            value={form.stock ?? 0}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
          <input
            required
            placeholder="SKU (unique)"
            value={form.sku ?? ""}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
        </div>

        {images.length > 0 && (
          <div>
            <label className="text-sm font-semibold block mb-2">Current photos</label>
            <div className="flex gap-2 flex-wrap">
              {images.map((img) => (
                <div key={img.id} className="relative h-16 w-16 rounded-lg overflow-hidden border border-[var(--color-line)]">
                  <Image src={mediaUrl(img.image)} alt={img.alt_text || ""} fill className="object-cover" sizes="64px" />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    aria-label="Remove photo"
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-semibold block mb-1">Add more photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setNewImages(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
        <div className="flex gap-3">
          <button
            disabled={saving}
            className="btn btn-ink"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/vendor/dashboard/products")}
            className="text-sm font-semibold text-neutral-500 px-4"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
