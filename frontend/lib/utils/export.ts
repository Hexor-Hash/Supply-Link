import type { TrackingEvent } from "@/lib/types";

const CSV_HEADERS = ["product_id", "event_type", "location", "actor", "timestamp", "metadata"] as const;

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(events: TrackingEvent[], filename = "events.csv") {
  if (events.length === 0) return;
  const rows = events.map((e) =>
    [e.productId, e.eventType, e.location, e.actor, e.timestamp, e.metadata]
      .map((v) => JSON.stringify(String(v ?? "")))
      .join(",")
  );
  downloadBlob([CSV_HEADERS.join(","), ...rows].join("\n"), filename, "text/csv");
}

export function exportToJSON(events: TrackingEvent[], filename = "events.json") {
  downloadBlob(JSON.stringify(events, null, 2), filename, "application/json");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
