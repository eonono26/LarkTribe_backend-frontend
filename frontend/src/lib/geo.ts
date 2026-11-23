"use client";

import { useCallback, useEffect, useState } from "react";
import { features } from "./features-api";

/**
 * Location is strictly opt-in. Nothing here ever calls the browser's geolocation
 * (or the server) until the shopper taps a button; the choice is remembered so
 * they are not asked again.
 */
const CONSENT_KEY = "lt_geo_consent";
const COORDS_KEY = "lt_geo_coords";

export interface Coords { lat: number; lng: number }
export type GeoStatus = "idle" | "asking" | "granted" | "denied" | "unavailable";

function readCoords(): Coords | null {
  try {
    const raw = sessionStorage.getItem(COORDS_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch { return null; }
}

export function useGeo() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");

  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) === "denied") { setStatus("denied"); return; }
      const c = readCoords();
      if (c) { setCoords(c); setStatus("granted"); }
    } catch { /* storage blocked */ }
  }, []);

  const request = useCallback((): Promise<Coords | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return Promise.resolve(null);
    }
    setStatus("asking");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setStatus("granted");
          try {
            localStorage.setItem(CONSENT_KEY, "granted");
            const first = !sessionStorage.getItem(COORDS_KEY);
            sessionStorage.setItem(COORDS_KEY, JSON.stringify(c));
            if (first) features.locationPing(c.lat, c.lng).catch(() => {});
          } catch { /* ignore */ }
          resolve(c);
        },
        () => {
          setStatus("denied");
          try { localStorage.setItem(CONSENT_KEY, "denied"); } catch { /* ignore */ }
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    });
  }, []);

  const forget = useCallback(() => {
    try { localStorage.removeItem(CONSENT_KEY); sessionStorage.removeItem(COORDS_KEY); } catch { /* ignore */ }
    setCoords(null);
    setStatus("idle");
  }, []);

  return { coords, status, request, forget };
}
