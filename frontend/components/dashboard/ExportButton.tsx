"use client";

import { Download } from "lucide-react";
import { exportToCSV, downloadCSV } from "@/lib/utils/export";
import type { TrackingEvent } from "@/lib/types";

interface ExportButtonProps {
  events: TrackingEvent[];
}

export function ExportButton({ events }: ExportButtonProps) {
  function handleExport() {
    const csv = exportToCSV(events);
    if (!csv) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `supply-link-events-${date}.csv`);
  }

  return (
    <button
      onClick={handleExport}
      disabled={events.length === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] disabled:opacity-40 transition-colors"
    >
      <Download size={13} />
      Export CSV
    </button>
  );
}
