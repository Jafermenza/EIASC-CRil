"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

// Leaflet's default marker icon assets are resolved via bundler-specific paths that
// break under Next.js; point them at the CDN-hosted assets instead.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Props = {
  latitude: string;
  longitude: string;
  onPick: (latitude: number, longitude: number) => void;
};

const DEFAULT_CENTER: [number, number] = [9.145, 40.4897]; // Ethiopia centroid fallback

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapLocationPicker({ latitude, longitude, onPick }: Props) {
  const lat = Number(latitude); const lng = Number(longitude);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng) && latitude !== "" && longitude !== "";
  const center = useMemo<[number, number]>(() => (hasPin ? [lat, lng] : DEFAULT_CENTER), [hasPin, lat, lng]);

  return (
    <div style={{ height: 320, width: "100%", borderRadius: 8, overflow: "hidden", border: "1px solid #d0d7de" }}>
      <MapContainer center={center} zoom={hasPin ? 13 : 6} style={{ height: "100%", width: "100%" }}>
        <RecenterOnPin hasPin={hasPin} lat={lat} lng={lng} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        {hasPin && (
          <Marker
            position={[lat, lng]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                onPick(pos.lat, pos.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

function RecenterOnPin({ hasPin, lat, lng }: { hasPin: boolean; lat: number; lng: number }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (hasPin) map.setView([lat, lng], Math.max(map.getZoom(), 13));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPin, lat, lng]);
  return null;
}
