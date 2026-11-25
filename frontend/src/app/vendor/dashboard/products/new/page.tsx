"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { vendorApi, VendorAgeGroup, VendorProductImageView } from "@/lib/vendor-api";

interface CategoryOption {
  id: number;
  name: string;
  department: { name: string };
}

type PendingPhoto = { file: File; color: string; view: VendorProductImageView };

const VIEW_OPTIONS: { value: VendorProductImageView; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "side", label: "Side" },
  { value: "detail", label: "Detail" },
  { value: "other", label: "Other" },
];

function hasFrontBackPhotos(photos: PendingPhoto[]): boolean {
  const groups = new Map<string, Set<string>>();
  photos.forEach((photo) => {
    const key = photo.color.trim().toLowerCase();
    const views = groups.get(key) ?? new Set<string>();
    views.add(photo.view);
    groups.set(key, views);
  });
  return [...groups.values()].some((views) => views.has("front") && views.has("back"));
}

const GENDER_OPTIONS = [
  { value: "unisex", label: "Unisex" },
  { value: "girls", label: "Girls" },
  { value: "boys", label: "Boys" },
] as const;

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [ageGroups, setAgeGroups] = useState<VendorAgeGroup[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    compare_at_price: "",
    stock: "0",
    sku: "",
    category: "",
    gender: "unisex" as "unisex" | "girls" | "boys",
  });
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<number[]>([]);
  const [images, setImages] = useState<PendingPhoto[]>([]);
  const [photoColor, setPhotoColor] = useState("");
  const [photoView, setPhotoView] = useState<VendorProductImageView>("front");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    vendorApi.categories().then((r) => setCategories(r.results));
    vendorApi.ageGroups().then(setAgeGroups).catch(() => setAgeGroups([]));
  }, []);

  function toggleAgeGroup(id: number) {
    setSelectedAgeGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

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
        gender: form.gender,
        age_groups: selectedAgeGroups,
      });
      for (let i = 0; i < images.length; i++) {
        const photo = images[i];
        await vendorApi.uploadProductImage(product.id, photo.file, i === 0, {
          color: photo.color,
          view: photo.view,
        });
      }
      if (hasFrontBackPhotos(images)) {
        // Submit the two matching angles to Meshy in the background.
        try { await vendorApi.generateProduct3D(product.id); } catch { /* Product remains saved; generation can be retried. */ }
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

        <div>
          <label className="text-sm font-semibold block mb-1">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          >
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-400 mt-1">
            Used for the Baby Boys / Baby Girls navigation — pick Unisex if it doesn&apos;t apply.
          </p>
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
            <p className="text-xs text-neutral-400 mt-1">Select every age range this product suits.</p>
          </div>
        )}

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

        <div className="space-y-2 rounded-xl border border-[var(--color-line)] p-3">
          <label className="text-sm font-semibold block">Product photos for 3D &amp; AR</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={photoColor}
              onChange={(e) => setPhotoColor(e.target.value)}
              placeholder="Colour (e.g. Brown)"
              className="w-full min-w-0 bg-[var(--color-mist)] rounded-lg px-3 py-2.5 outline-none"
            />
            <select
              value={photoView}
              onChange={(e) => setPhotoView(e.target.value as VendorProductImageView)}
              className="w-full min-w-0 bg-[var(--color-mist)] rounded-lg px-3 py-2.5 outline-none"
            >
              {VIEW_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              const tooLarge = files.find((file) => file.size > 5 * 1024 * 1024);
              if (tooLarge) {
                setError(`\u201c${tooLarge.name}\u201d is larger than 5 MB.`);
              } else {
                setImages((current) => [...current, ...files.map((file) => ({
                  file, color: photoColor.trim(), view: photoView,
                }))]);
                setError("");
              }
              e.currentTarget.value = "";
            }}
            className="text-sm"
          />
          {images.length > 0 && (
            <ul className="space-y-1 text-xs text-neutral-500">
              {images.map((photo, index) => (
                <li key={`${photo.file.name}-${index}`} className="flex justify-between gap-2">
                  <span className="truncate">{photo.file.name} · {photo.color || "General"} · {photo.view}</span>
                  <button type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="font-semibold">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-neutral-400">
            Upload the Front and Back views using the same colour. Once both are saved, Meshy starts creating the 3D model in the background. JPG/PNG/WebP, up to 5 MB each.
          </p>
        </div>

        {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
        <button
          disabled={saving}
          className="btn btn-ink"
        >
          {saving ? "Saving…" : "Save product"}
        </button>
      </form>
    </div>
  );
}
