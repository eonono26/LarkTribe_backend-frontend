"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({});
  useEffect(() => { map.setView([lat, lng]); }, [lat, lng]);
  return null;
}

export default function MapPicker({
  center,
  onChange,
}: {
  center: { lat: number; lng: number };
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[center.lat, center.lng]}
        icon={icon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const pos = e.target.getLatLng();
            onChange(pos.lat, pos.lng);
          },
        }}
      />
      <ClickHandler onChange={onChange} />
      <Recenter lat={center.lat} lng={center.lng} />
    </MapContainer>
  );
}