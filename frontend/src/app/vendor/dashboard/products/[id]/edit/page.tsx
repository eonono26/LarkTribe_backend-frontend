"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { vendorApi, VendorProduct, VendorProductImage, VendorAgeGroup, VendorProductImageView } from "@/lib/vendor-api";
import { mediaUrl } from "@/lib/api";
import Model3DViewer from "@/components/Model3DViewer";

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

function hasFrontBackPhotos(photos: Array<{ color: string; view: string }>): boolean {
  const groups = new Map<string, Set<string>>();
  photos.forEach((photo) => {
    const key = (photo.color || "").trim().toLowerCase();
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

export default function EditProductPage() {
  const params = useParams();
  const productId = Number(params.id);
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [ageGroups, setAgeGroups] = useState<VendorAgeGroup[]>([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<number[]>([]);
  const [images, setImages] = useState<VendorProductImage[]>([]);
  const [newImages, setNewImages] = useState<PendingPhoto[]>([]);
  const [photoColor, setPhotoColor] = useState("");
  const [photoView, setPhotoView] = useState<VendorProductImageView>("front");
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
              ? product.age_groups.map((ag: number | VendorAgeGroup) => (typeof ag === "number" ? ag : ag.id))
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
      const uploaded: VendorProductImage[] = [];
      for (let i = 0; i < newImages.length; i++) {
        const photo = newImages[i];
        uploaded.push(await vendorApi.uploadProductImage(productId, photo.file, images.length === 0 && i === 0, {
          color: photo.color,
          view: photo.view,
        }));
      }
      const allPhotos = [...images, ...uploaded];
      if (uploaded.length) setImages(allPhotos);
      if (uploaded.length && hasFrontBackPhotos(allPhotos)) {
        // A matching front/back pair is enough to start Meshy without blocking the seller.
        try {
          await vendorApi.generateProduct3D(productId);
          setForm((current) => current ? { ...current, ar_generation_status: "queued" } : current);
        } catch { /* Product remains saved; generation can be retried from the 3D panel. */ }
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

        {(form.model_3d_url || form.ar_generation_status) && images.length > 0 && (
          <section className="space-y-2 border border-[var(--color-line)] rounded-xl p-3">
            <h3 className="text-sm font-semibold">3D &amp; AR product preview</h3>
            {form.model_3d_url ? (
              <Model3DViewer src={form.model_3d_url} iosSrc={form.model_3d_ios_url} poster={form.model_3d_poster_url || undefined} alt={form.name || "Product"} />
            ) : (
              <p className="text-xs text-neutral-500">
                {form.ar_generation_status === "failed" ? "3D generation failed. Add clearer product photos and retry." : form.ar_generation_status === "queued" || form.ar_generation_status === "processing" ? "Your 3D model is being generated. Your product photos remain available." : "Your product photos are ready. Generate the interactive 3D and AR preview when you're ready."}
              </p>
            )}
            {form.model_3d_url ? <p className="text-xs text-emerald-700">3D model ready for shoppers and AR-supported devices.</p> : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await vendorApi.generateProduct3D(productId);
                    setForm((current) => current ? { ...current, ar_generation_status: "queued" } : current);
                  } catch (error) {
                    setError(error instanceof Error ? error.message : "Could not start 3D generation.");
                  }
                }}
                className="text-xs font-semibold underline underline-offset-4"
              >
                Generate 3D preview
              </button>
            )}
          </section>
        )}

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

        <div className="space-y-2 rounded-xl border border-[var(--color-line)] p-3">
          <label className="text-sm font-semibold block">Add more photos for 3D &amp; AR</label>
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
                setNewImages((current) => [...current, ...files.map((file) => ({
                  file, color: photoColor.trim(), view: photoView,
                }))]);
                setError("");
              }
              e.currentTarget.value = "";
            }}
            className="text-sm"
          />
          {newImages.length > 0 && (
            <ul className="space-y-1 text-xs text-neutral-500">
              {newImages.map((photo, index) => (
                <li key={`${photo.file.name}-${index}`} className="flex justify-between gap-2">
                  <span className="truncate">{photo.file.name} · {photo.color || "General"} · {photo.view}</span>
                  <button type="button" onClick={() => setNewImages((current) => current.filter((_, i) => i !== index))} className="font-semibold">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-neutral-400">
            Use the same colour for Front and Back. Saving both views automatically starts 3D generation in the background. JPG/PNG/WebP, up to 5 MB each.
          </p>
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
