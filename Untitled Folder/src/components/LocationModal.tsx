"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, Navigation, Search } from "lucide-react";
import { useLocalization } from "@/lib/localization-context";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

interface LocationValue { label: string; lat: number; lng: number }

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (location: LocationValue) => void;
  initialLocation?: LocationValue;
}

const NAIROBI = { lat: -1.2921, lng: 36.8219 };

export default function LocationModal({ open, onClose, onSave, initialLocation }: LocationModalProps) {
  const { t } = useLocalization();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationValue[]>([]);
  const [picked, setPicked] = useState<LocationValue>(initialLocation ?? { label: "Nairobi, Kenya", ...NAIROBI });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (initialLocation) setPicked(initialLocation);
  }, [initialLocation, open]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ke&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setResults(data.map((d: any) => ({ label: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })));
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPicked({ label: "Current location", lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => setLoading(false)
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--color-paper)] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
          <h2 className="font-display text-lg font-bold">{t("chooseDeliveryLocation")}</h2>
          <button onClick={onClose} aria-label="Close" className="hover:opacity-70">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-[var(--color-mist)] rounded-full px-4 py-2.5">
            <Search size={18} className="text-neutral-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchAreaPlaceholder")}
              className="bg-transparent w-full outline-none text-sm"
            />
          </form>

          <button type="button" onClick={useMyLocation} className="flex items-center gap-2 text-sm font-semibold text-[var(--color-signal)]">
            <Navigation size={16} />
            {loading ? t("locating") : t("useMyLocation")}
          </button>

          {results.length > 0 && (
            <ul className="border border-[var(--color-line)] rounded-xl divide-y divide-[var(--color-line)] max-h-40 overflow-y-auto">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => { setPicked(r); setResults([]); setQuery(r.label); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-mist)] flex gap-2 items-start"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0 text-neutral-400" />
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="h-64 w-full rounded-xl overflow-hidden border border-[var(--color-line)]">
            <MapPicker center={picked} onChange={(lat, lng) => setPicked((p) => ({ ...p, lat, lng, label: p.label === "Current location" ? p.label : "Pinned location" }))} />
          </div>

          <p className="text-xs text-neutral-500 flex items-center gap-1">
            <MapPin size={12} /> {picked.label}
          </p>
        </div>

        <div className="p-5 border-t border-[var(--color-line)]">
          <button
            onClick={() => { onSave(picked); onClose(); }}
            className="btn btn-ink btn-block"
          >
            {t("confirmLocation")}
          </button>
        </div>
      </div>
    </div>
  );
}