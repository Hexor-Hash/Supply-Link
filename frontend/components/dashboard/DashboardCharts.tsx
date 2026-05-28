"use client";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";
import type { EventType } from "@/lib/types";

interface DashboardChartsProps {
  dailyCounts: Array<{ date: string; count: number }>;
  eventTypeCounts: Array<{ name: string; value: number }>;
}

export default function DashboardCharts({
  dailyCounts,
  eventTypeCounts,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Line chart — events per day */}
      <div className="lg:col-span-2 border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--foreground)] mb-4">
          Events per day (last 30 days)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyCounts}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              interval={4}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart — event type distribution */}
      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--foreground)] mb-4">
          Event type distribution
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={eventTypeCounts}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {eventTypeCounts.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={EVENT_TYPE_CONFIG[entry.name as EventType]?.color ?? "#6b7280"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
