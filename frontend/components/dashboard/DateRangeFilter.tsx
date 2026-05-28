"use client";

import { useState } from "react";
import type { DateRange } from "@/lib/hooks/useDashboardData";

type Preset = "7d" | "30d" | "90d" | "custom";

interface DateRangeFilterProps {
  onChange: (range: DateRange) => void;
}

function presetToRange(preset: Exclude<Preset, "custom">): DateRange {
  const to = Date.now();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return { from: to - days * 86_400_000, to };
}

export function DateRangeFilter({ onChange }: DateRangeFilterProps) {
  const [active, setActive] = useState<Preset>("30d");
  const [custom, setCustom] = useState({ from: "", to: "" });

  function selectPreset(p: Exclude<Preset, "custom">) {
    setActive(p);
    onChange(presetToRange(p));
  }

  function applyCustom() {
    if (!custom.from || !custom.to) return;
    onChange({ from: new Date(custom.from).getTime(), to: new Date(custom.to).getTime() });
  }

  const presets: { label: string; value: Exclude<Preset, "custom"> }[] = [
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => selectPreset(value)}
          className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
            active === value
              ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]"
              : "border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--muted-bg)]"
          }`}
        >
          {label}
        </button>
      ))}

      {/* Custom range */}
      <button
        onClick={() => setActive("custom")}
        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
          active === "custom"
            ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]"
            : "border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--muted-bg)]"
        }`}
      >
        Custom
      </button>

      {active === "custom" && (
        <>
          <input
            type="date"
            value={custom.from}
            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            className="px-2 py-1 text-xs rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)]"
          />
          <span className="text-xs text-[var(--muted)]">→</span>
          <input
            type="date"
            value={custom.to}
            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            className="px-2 py-1 text-xs rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)]"
          />
          <button
            onClick={applyCustom}
            disabled={!custom.from || !custom.to}
            className="px-3 py-1.5 text-xs rounded-md bg-[var(--primary)] text-[var(--primary-fg)] disabled:opacity-40"
          >
            Apply
          </button>
        </>
      )}
    </div>
  );
}
