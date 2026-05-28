"use client";

import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TrackingEvent, EventType } from "@/lib/types";

const EVENT_TYPES: EventType[] = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];

const EVENT_COLOR: Record<EventType, string> = {
  HARVEST: "#22c55e",
  PROCESSING: "#3b82f6",
  SHIPPING: "#eab308",
  RETAIL: "#a855f7",
};

interface ChartPoint {
  x: number; // timestamp ms
  y: number; // event type index
  event: TrackingEvent;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  selected?: boolean;
  onClick?: (p: ChartPoint) => void;
}

function CustomDot({ cx = 0, cy = 0, payload, selected, onClick }: CustomDotProps) {
  if (!payload) return null;
  const color = EVENT_COLOR[payload.event.eventType];
  return (
    <circle
      cx={cx}
      cy={cy}
      r={selected ? 9 : 7}
      fill={color}
      stroke={selected ? "#fff" : color}
      strokeWidth={selected ? 2 : 0}
      style={{ cursor: "pointer" }}
      onClick={() => onClick?.(payload)}
    />
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { event } = payload[0].payload;
  return (
    <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs shadow-lg max-w-[220px]">
      <p className="font-semibold" style={{ color: EVENT_COLOR[event.eventType] }}>
        {event.eventType}
      </p>
      <p className="text-[var(--foreground)] mt-0.5">{event.location}</p>
      <p className="text-[var(--muted)] mt-0.5">{new Date(event.timestamp).toLocaleString()}</p>
      <p className="text-[var(--muted)] font-mono mt-0.5 truncate">
        {event.actor.slice(0, 8)}…{event.actor.slice(-6)}
      </p>
    </div>
  );
}

interface Props {
  events: TrackingEvent[];
}

export function TimelineChart({ events }: Props) {
  const [selected, setSelected] = useState<TrackingEvent | null>(null);

  if (events.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-6 text-center">
        No events recorded for this product yet.
      </p>
    );
  }

  const points: ChartPoint[] = events.map((e) => ({
    x: e.timestamp,
    y: EVENT_TYPES.indexOf(e.eventType),
    event: e,
  }));

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <XAxis
            dataKey="x"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v) => new Date(v).toLocaleDateString()}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            name="Time"
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={[-0.5, EVENT_TYPES.length - 0.5]}
            ticks={EVENT_TYPES.map((_, i) => i)}
            tickFormatter={(i) => EVENT_TYPES[i] ?? ""}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<ChartTooltip />} />
          <Scatter data={points} shape={(props: CustomDotProps) => (
            <CustomDot
              {...props}
              selected={props.payload?.event === selected}
              onClick={(p) => setSelected((prev) => (prev === p.event ? null : p.event))}
            />
          )} />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {EVENT_TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: EVENT_COLOR[t] }} />
            {t}
          </span>
        ))}
      </div>

      {/* Selected event detail panel */}
      {selected && (
        <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl px-4 py-3 text-sm flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: EVENT_COLOR[selected.eventType] }}>
              {selected.eventType}
            </span>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-[var(--foreground)]">{selected.location}</p>
          <p className="text-xs text-[var(--muted)]">{new Date(selected.timestamp).toLocaleString()}</p>
          <p className="text-xs font-mono text-[var(--muted)]">{selected.actor}</p>
          {(() => {
            try {
              const meta = JSON.parse(selected.metadata);
              if (Object.keys(meta).length === 0) return null;
              return (
                <pre className="text-xs bg-[var(--muted-bg)] text-[var(--muted)] rounded-md px-3 py-2 overflow-x-auto mt-1">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              );
            } catch {
              return null;
            }
          })()}
        </div>
      )}
    </div>
  );
}
