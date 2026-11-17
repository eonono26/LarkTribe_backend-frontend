"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="background:#2f6f4f;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const dropoffIcon = L.divIcon({
  className: "",
  html: `<div style="background:var(--color-accent);width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="background:var(--color-ink,#1a1a1a);width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:12px;">🛵</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);
  return null;
}

export interface TrackingMapPoint {
  lat: number;
  lng: number;
}

export default function DeliveryTrackingMap({
  pickup,
  dropoff,
  driver,
  pickupLabel,
  dropoffLabel,
  driverLabel,
}: {
  pickup: TrackingMapPoint | null;
  dropoff: TrackingMapPoint | null;
  driver: TrackingMapPoint | null;
  pickupLabel?: string;
  dropoffLabel?: string;
  driverLabel?: string;
}) {
  const points: [number, number][] = [pickup, dropoff, driver]
    .filter((p): p is TrackingMapPoint => !!p)
    .map((p) => [p.lat, p.lng]);

  const routeLine: [number, number][] = [pickup, dropoff]
    .filter((p): p is TrackingMapPoint => !!p)
    .map((p) => [p.lat, p.lng]);

  const initialCenter: [number, number] = points[0] || [-1.286389, 36.817223];

  return (
    <MapContainer center={initialCenter} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />

      {routeLine.length === 2 && (
        <Polyline positions={routeLine} pathOptions={{ color: "#9CA3AF", weight: 3, dashArray: "6 8" }} />
      )}

      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>{pickupLabel || "Pickup"}</Popup>
        </Marker>
      )}
      {dropoff && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
          <Popup>{dropoffLabel || "Delivery address"}</Popup>
        </Marker>
      )}
      {driver && (
        <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
          <Popup>{driverLabel || "Your driver"}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
