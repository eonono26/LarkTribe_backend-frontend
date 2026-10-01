"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HeroBanner } from "@/components/Banner";
import type { Coupon, Campaign, Department } from "@/lib/types";

const STYLE_OPTIONS: { value: Campaign["style"]; label: string; hint: string }[] = [
  { value: "hero", label: "Hero", hint: "Large full-width image + headline — main homepage banner." },
  { value: "strip", label: "Strip", hint: "Thin announcement bar across the top of the page." },
  { value: "split", label: "Split", hint: "Image beside text — good for a themed collection push." },
  { value: "countdown", label: "Countdown", hint: "Flash-sale banner with a live timer to the end date." },
  { value: "card", label: "Card", hint: "Compact tile, shown in a row of up to three." },
];

const PLACEMENT_OPTIONS = [
  { value: "homepage_banner", label: "Homepage" },
  { value: "category_banner", label: "Category page" },
];

export default function AdminPromotionsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");

  const [form, setForm] = useState({
    title: "",
    description: "",
    placement: "homepage_banner" as "homepage_banner" | "category_banner",
    style: "hero" as Campaign["style"],
    background_color: "#FFD400",
    cta_label: "Shop now",
    link_url: "",
    department: "",
    ends_at: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  function load() {
    api.adminCoupons().then((r) => setCoupons(Array.isArray(r) ? r : r.results));
    api.adminCampaigns().then((r) => setCampaigns(Array.isArray(r) ? r : r.results));
    api.departments().then((r) => setDepartments(r.results));
  }
  useEffect(load, []);

  async function createCoupon() {
    if (!newCode) return;
    await api.adminCreateCoupon({ code: newCode.toUpperCase(), percent_off: parseFloat(newPercent), active: true });
    setNewCode("");
    load();
  }

  async function createCampaign() {
    if (!form.title) return;
    setCreating(true);
    try {
      await api.adminCreateCampaign({
        title: form.title,
        description: form.description,
        placement: form.placement,
        style: form.style,
        background_color: form.background_color,
        cta_label: form.cta_label,
        link_url: form.link_url,
        department: form.department ? parseInt(form.department, 10) : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        active: true,
        imageFile: imageFile || undefined,
      });
      setForm({ ...form, title: "", description: "", link_url: "" });
      setImageFile(null);
      load();
    } finally {
      setCreating(false);
    }
  }

  async function removeCampaign(id: number) {
    await api.adminDeleteCampaign(id);
    load();
  }

  const previewCampaign: Campaign = {
    id: 0,
    title: form.title || "Your banner title",
    description: form.description,
    placement: form.placement,
    style: form.style,
    background_color: form.background_color,
    cta_label: form.cta_label,
    image: imageFile ? URL.createObjectURL(imageFile) : null,
    link_url: form.link_url,
    department: form.department ? parseInt(form.department, 10) : null,
    coupon: null,
    is_ai_generated: false,
    active: true,
    starts_at: new Date().toISOString(),
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : new Date(Date.now() + 86400000).toISOString(),
    is_live: true,
    created_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-black mb-4">Coupons</h1>
        <div className="flex gap-2 mb-4">
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Code e.g. WELCOME10"
            className="bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            value={newPercent}
            onChange={(e) => setNewPercent(e.target.value)}
            type="number"
            placeholder="% off"
            className="bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none w-24"
          />
          <button onClick={createCoupon} className="btn btn-ink btn-sm">
            Create
          </button>
        </div>
        <div className="space-y-1 text-sm">
          {coupons.map((c) => (
            <div key={c.id} className="flex justify-between border-b border-[var(--color-line)] py-1.5">
              <span className="font-mono font-bold">{c.code}</span>
              <span>{c.percent_off ? `${c.percent_off}% off` : `KSh ${c.amount_off} off`} · {c.active ? "active" : "inactive"}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-black mb-4">Banners & campaigns</h2>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Banner title"
              className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2.5 text-sm outline-none"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description (optional)"
              rows={2}
              className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2.5 text-sm outline-none"
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Banner style</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, style: opt.value })}
                    className={`text-left border rounded-lg p-2.5 text-xs ${
                      form.style === opt.value ? "border-[var(--color-ink)] bg-[var(--color-mist)]" : "border-[var(--color-line)]"
                    }`}
                  >
                    <span className="font-semibold block">{opt.label}</span>
                    <span className="text-neutral-500">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 block mb-1">Placement</label>
                <select
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value as typeof form.placement })}
                  className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {PLACEMENT_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 block mb-1">Department (optional)</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 block mb-1">Background color</label>
                <input
                  type="color"
                  value={form.background_color}
                  onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[var(--color-line)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 block mb-1">Button label</label>
                <input
                  value={form.cta_label}
                  onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                  className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 block mb-1">Link URL (optional)</label>
              <input
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="/category/women"
                className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>

            {form.style === "countdown" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 block mb-1">Ends at</label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            )}

            {(form.style === "hero" || form.style === "split") && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 block mb-1">Image</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="text-sm" />
              </div>
            )}

            <button
              onClick={createCampaign}
              disabled={creating || !form.title}
              className="btn btn-ink btn-sm"
            >
              {creating ? "Creating…" : "Create banner"}
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Live preview</p>
            <div className="border border-dashed border-[var(--color-line)] rounded-lg p-4 bg-neutral-50">
              <HeroBanner campaign={previewCampaign} />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">All banners</p>
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-[var(--color-line)] py-2 text-sm">
              <span>
                {c.title} {c.is_ai_generated && <span className="text-[10px] uppercase text-neutral-400 ml-1">AI suggested</span>}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-500 text-xs">
                  {c.placement.replace(/_/g, " ")} · {c.style} · {c.is_live ? "live" : "inactive"}
                </span>
                <button onClick={() => removeCampaign(c.id)} className="text-[var(--color-flag)] text-xs font-semibold uppercase">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-sm text-neutral-500">No banners yet — create one above.</p>}
        </div>
      </div>
    </div>
  );
}
