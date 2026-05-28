"use client";

import type { Product, TrackingEvent, EventType } from "@/lib/types";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  return `${h}h`;
}

function eventKey(e: TrackingEvent) {
  return e.eventType;
}

// ── stat card ─────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "better" | "worse" | "same";
}) {
  const color =
    highlight === "better"
      ? "text-green-600 dark:text-green-400"
      : highlight === "worse"
      ? "text-red-500"
      : "text-[var(--foreground)]";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ── single timeline column ────────────────────────────────────────────────────

function TimelineColumn({
  events,
  diffTypes,
}: {
  events: TrackingEvent[];
  diffTypes: Set<EventType>; // types present in this product but not all others
}) {
  if (events.length === 0)
    return <p className="text-xs text-[var(--muted)] mt-2">No events recorded.</p>;

  return (
    <ol className="relative border-l border-[var(--card-border)] ml-2 space-y-5">
      {events.map((e, i) => {
        const cfg = EVENT_TYPE_CONFIG[e.eventType];
        const Icon = cfg?.icon;
        const isUnique = diffTypes.has(e.eventType);
        return (
          <li key={i} className="ml-5">
            <span
              className={`absolute -left-2 mt-1 h-4 w-4 rounded-full border-2 border-[var(--background)] ${
                isUnique ? "ring-2 ring-amber-400" : ""
              }`}
              style={{ background: cfg?.color ?? "#6b7280" }}
            />
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${cfg?.badgeClass ?? "bg-gray-100 text-gray-800"}`}
              >
                {Icon && <Icon size={10} />}
                {cfg?.label ?? e.eventType}
              </span>
              {isUnique && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                  unique
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--foreground)] font-medium">{e.location}</p>
            <p className="text-xs text-[var(--muted)]">
              {new Date(e.timestamp).toLocaleString()}
            </p>
            {i > 0 && (
              <p className="text-xs text-[var(--muted)] mt-0.5">
                +{fmtDuration(e.timestamp - events[i - 1].timestamp)} since prev
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface CompareTimelineProps {
  products: Product[];
  eventsByProduct: Record<string, TrackingEvent[]>;
}

export function CompareTimeline({ products, eventsByProduct }: CompareTimelineProps) {
  // Compute per-product stats
  const stats = products.map((p) => {
    const evts = eventsByProduct[p.id] ?? [];
    const sorted = [...evts].sort((a, b) => a.timestamp - b.timestamp);
    const duration =
      sorted.length >= 2
        ? sorted[sorted.length - 1].timestamp - sorted[0].timestamp
        : null;
    const types = new Set(evts.map((e) => e.eventType as EventType));
    return { product: p, evts: sorted, duration, types };
  });

  // Which event types are present in each product but not all products
  const allTypes = stats.map((s) => s.types);
  const diffTypesPerProduct = stats.map((s) => {
    const unique = new Set<EventType>();
    for (const t of s.types) {
      if (!allTypes.every((ts) => ts.has(t))) unique.add(t);
    }
    return unique;
  });

  // For stat highlights: most events = "better", fewest = "worse"
  const counts = stats.map((s) => s.evts.length);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  const durations = stats.map((s) => s.duration);
  const validDurations = durations.filter((d): d is number => d !== null);
  const minDuration = validDurations.length ? Math.min(...validDurations) : null;
  const maxDuration = validDurations.length ? Math.max(...validDurations) : null;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-4 min-w-[600px]"
        style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }}
      >
        {stats.map(({ product, evts, duration, types }, i) => (
          <div
            key={product.id}
            className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 flex flex-col gap-4"
          >
            {/* Product header */}
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)] leading-tight">
                {product.name}
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Origin: {product.origin}</p>
              <p className="text-xs font-mono text-[var(--muted)] truncate mt-0.5">{product.id}</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 border border-[var(--card-border)] rounded-lg p-3">
              <Stat
                label="Events"
                value={evts.length}
                highlight={
                  counts.every((c) => c === evts.length)
                    ? "same"
                    : evts.length === maxCount
                    ? "better"
                    : evts.length === minCount
                    ? "worse"
                    : undefined
                }
              />
              <Stat
                label="Stages"
                value={types.size}
              />
              <Stat
                label="Total duration"
                value={duration !== null ? fmtDuration(duration) : "—"}
                highlight={
                  duration === null
                    ? undefined
                    : duration === minDuration
                    ? "better"
                    : duration === maxDuration
                    ? "worse"
                    : undefined
                }
              />
              <Stat
                label="Unique stages"
                value={diffTypesPerProduct[i].size > 0 ? diffTypesPerProduct[i].size : "—"}
              />
            </div>

            {/* Timeline */}
            <TimelineColumn
              events={evts}
              diffTypes={diffTypesPerProduct[i]}
            />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full ring-2 ring-amber-400 bg-gray-400" />
          Stage present in this product but not all others
        </span>
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">↑ better</span>
        <span className="flex items-center gap-1 text-red-500 font-medium">↓ worse</span>
      </div>
    </div>
  );
}
