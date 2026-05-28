"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { TrackingEvent } from "@/lib/types";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";

interface GeoEvent {
  event: TrackingEvent;
  lat: number;
  lng: number;
}

function parseCoords(metadata: string): { lat: number; lng: number } | null {
  try {
    const m = JSON.parse(metadata) as Record<string, unknown>;
    const lat = Number(m.lat);
    const lng = Number(m.lng);
    if (isFinite(lat) && isFinite(lng)) return { lat, lng };
  } catch {
    // ignore
  }
  return null;
}

interface Props {
  events: TrackingEvent[];
}

export function EventMap({ events }: Props) {
  // Fix Leaflet's default icon path issue in webpack/Next.js
  useEffect(() => {
    // No-op: we use CircleMarker so no icon images needed
  }, []);

  const geoEvents: GeoEvent[] = events.flatMap((e) => {
    const coords = parseCoords(e.metadata);
    return coords ? [{ event: e, ...coords }] : [];
  });

  if (geoEvents.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-6 text-center">
        No location coordinates found in event metadata.
      </p>
    );
  }

  const center: [number, number] = [
    geoEvents.reduce((s, g) => s + g.lat, 0) / geoEvents.length,
    geoEvents.reduce((s, g) => s + g.lng, 0) / geoEvents.length,
  ];

  return (
    <MapContainer
      center={center}
      zoom={3}
      style={{ height: "360px", width: "100%", borderRadius: "0.5rem" }}
      aria-label="Event location map"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {geoEvents.map(({ event, lat, lng }, i) => {
        const cfg = EVENT_TYPE_CONFIG[event.eventType];
        return (
          <CircleMarker
            key={i}
            center={[lat, lng]}
            radius={9}
            pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[160px]">
                <p className="font-semibold text-sm">{cfg.label}</p>
                <p>{event.location}</p>
                <p className="text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                <p className="font-mono text-gray-400 break-all">
                  {event.actor.slice(0, 8)}…{event.actor.slice(-6)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
