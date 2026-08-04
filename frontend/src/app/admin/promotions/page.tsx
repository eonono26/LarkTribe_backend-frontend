"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Coupon, Campaign } from "@/lib/types";

export default function AdminPromotionsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");
  const [newCampaignTitle, setNewCampaignTitle] = useState("");

  function load() {
    api.adminCoupons().then((r) => setCoupons(Array.isArray(r) ? r : r.results));
    api.adminCampaigns().then((r) => setCampaigns(Array.isArray(r) ? r : r.results));
  }
  useEffect(load, []);

  async function createCoupon() {
    if (!newCode) return;
    await api.adminCreateCoupon({ code: newCode.toUpperCase(), percent_off: parseFloat(newPercent), active: true });
    setNewCode("");
    load();
  }

  async function createCampaign() {
    if (!newCampaignTitle) return;
    await api.adminCreateCampaign({ title: newCampaignTitle, placement: "homepage_banner", active: true });
    setNewCampaignTitle("");
    load();
  }

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
          <button onClick={createCoupon} className="bg-[var(--color-ink)] text-white text-xs font-semibold uppercase px-4 rounded-full">
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
        <h2 className="font-display text-xl font-black mb-4">Campaigns / banners</h2>
        <div className="flex gap-2 mb-4">
          <input
            value={newCampaignTitle}
            onChange={(e) => setNewCampaignTitle(e.target.value)}
            placeholder="Campaign title"
            className="bg-[var(--color-mist)] rounded-lg px-3 py-2 text-sm outline-none flex-1"
          />
          <button onClick={createCampaign} className="bg-[var(--color-ink)] text-white text-xs font-semibold uppercase px-4 rounded-full">
            Create
          </button>
        </div>
        <div className="space-y-1 text-sm">
          {campaigns.map((c) => (
            <div key={c.id} className="flex justify-between border-b border-[var(--color-line)] py-1.5">
              <span>{c.title} {c.is_ai_generated && <span className="text-[10px] uppercase text-neutral-400 ml-1">AI suggested</span>}</span>
              <span className="text-neutral-500">{c.placement.replace(/_/g, " ")} · {c.is_live ? "live" : "inactive"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
