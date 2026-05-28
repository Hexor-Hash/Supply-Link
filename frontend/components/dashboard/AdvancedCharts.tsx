"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ProcessingTime, TopProduct, ActorActivity } from "@/lib/hooks/useDashboardData";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";
import type { EventType } from "@/lib/types";

const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: 8,
  fontSize: 12,
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 shadow-sm">
      <p className="text-sm font-semibold text-[var(--foreground)] mb-4">{title}</p>
      {children}
    </div>
  );
}

interface Props {
  processingTimes: ProcessingTime[];
  topProducts: TopProduct[];
  actorLeaderboard: ActorActivity[];
}

export default function AdvancedCharts({ processingTimes, topProducts, actorLeaderboard }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Avg processing time per stage */}
      <ChartCard title="Avg. time between events (hours)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={processingTimes} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="stage"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} h`, "Avg time"]} />
            <Bar dataKey="avgHours" radius={[0, 4, 4, 0]}>
              {processingTimes.map(({ stage }) => (
                <Cell
                  key={stage}
                  fill={EVENT_TYPE_CONFIG[stage as EventType]?.color ?? "#6b7280"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top products by event count */}
      <ChartCard title="Top products by event count">
        {topProducts.length === 0 ? (
          <p className="text-xs text-[var(--muted)] mt-2">No data in selected range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                width={90}
                tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 12) + "…" : v)}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Events"]} />
              <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Actor leaderboard */}
      <ChartCard title="Actor leaderboard">
        {actorLeaderboard.length === 0 ? (
          <p className="text-xs text-[var(--muted)] mt-2">No data in selected range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={actorLeaderboard} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="actor"
                tick={{ fontSize: 11, fill: "var(--muted)", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Events"]} />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
