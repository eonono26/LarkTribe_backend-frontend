"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import type { DriverAdmin, DeliveryAdmin } from "@/lib/types";

const driverIcon = (busy: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${busy ? "#c96e6e" : "#2f6f4f"};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:12px;">🛵</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const dropoffIcon = L.divIcon({
  className: "",
  html: `<div style="background:#1a1a1a;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);
  return null;
}

export default function AdminDispatchMap({
  drivers,
  deliveries,
}: {
  drivers: DriverAdmin[];
  deliveries: DeliveryAdmin[];
}) {
  const driverPoints = drivers
    .filter((d) => d.current_lat && d.current_lng)
    .map((d) => ({ d, lat: parseFloat(d.current_lat!), lng: parseFloat(d.current_lng!) }));

  const dropoffPoints = deliveries
    .filter((d) => d.dropoff_lat && d.dropoff_lng && d.status === "unassigned")
    .map((d) => ({ d, lat: parseFloat(d.dropoff_lat!), lng: parseFloat(d.dropoff_lng!) }));

  const allPoints: [number, number][] = [
    ...driverPoints.map((p) => [p.lat, p.lng] as [number, number]),
    ...dropoffPoints.map((p) => [p.lat, p.lng] as [number, number]),
  ];
  const initialCenter: [number, number] = allPoints[0] || [-1.286389, 36.817223];

  return (
    <MapContainer center={initialCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={allPoints} />

      {driverPoints.map(({ d, lat, lng }) => (
        <Marker key={`driver-${d.id}`} position={[lat, lng]} icon={driverIcon(d.active_delivery_count > 0)}>
          <Popup>
            <strong>{d.name}</strong>
            <br />
            {d.vehicle_type} · {d.active_delivery_count} active job{d.active_delivery_count === 1 ? "" : "s"}
          </Popup>
        </Marker>
      ))}

      {dropoffPoints.map(({ d, lat, lng }) => (
        <Marker key={`delivery-${d.id}`} position={[lat, lng]} icon={dropoffIcon}>
          <Popup>
            <strong>Order {d.order_number}</strong>
            <br />
            {d.dropoff_label}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
