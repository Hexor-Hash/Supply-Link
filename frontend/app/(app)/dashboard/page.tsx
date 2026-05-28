"use client";

import { useState } from "react";
import { Package, Activity, CheckCircle, Clock } from "lucide-react";
import { useDashboardData, type DateRange } from "@/lib/hooks/useDashboardData";
import { LazyDashboardCharts } from "@/components/lazy/LazyDashboardCharts";
import { LazyAdvancedCharts } from "@/components/lazy/LazyAdvancedCharts";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { ChartSkeleton } from "@/components/skeletons/LoadingSkeletons";
import type { EventType } from "@/lib/types";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";

const DEFAULT_RANGE: DateRange = {
  from: Date.now() - 30 * 86_400_000,
  to: Date.now(),
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
      <div className="p-2 rounded-lg bg-[var(--muted-bg)]">
        <Icon size={20} className="text-[var(--foreground)]" />
      </div>
      <div>
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);

  const {
    stats,
    dailyCounts,
    eventTypeCounts,
    processingTimes,
    topProducts,
    actorLeaderboard,
    recentEvents,
    filteredEvents,
  } = useDashboardData(range);

  return (
    <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter onChange={setRange} />
          <ExportButton events={filteredEvents} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={stats.totalProducts} icon={Package} />
        <StatCard label="Events in Range" value={stats.totalEvents} icon={Activity} />
        <StatCard label="Active Products" value={stats.activeProducts} icon={CheckCircle} />
        <StatCard label="Last 24 h" value={stats.recentActivity} icon={Clock} />
      </div>

      {/* Existing charts */}
      <LazyDashboardCharts dailyCounts={dailyCounts} eventTypeCounts={eventTypeCounts} />

      {/* Advanced analytics */}
      <LazyAdvancedCharts
        processingTimes={processingTimes}
        topProducts={topProducts}
        actorLeaderboard={actorLeaderboard}
      />

      {/* Recent events table */}
      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--card-border)]">
          <p className="text-sm font-semibold text-[var(--foreground)]">Recent Events</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--card-border)]">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Location</th>
                <th className="px-5 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-[var(--muted)]">
                    No events in selected range.
                  </td>
                </tr>
              ) : (
                recentEvents.map((e, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--muted-bg)] transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-[var(--foreground)]">
                      {e.productId}
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const cfg = EVENT_TYPE_CONFIG[e.eventType as EventType];
                        const Icon = cfg?.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg?.badgeClass ?? "bg-gray-100 text-gray-800"}`}>
                            {Icon && <Icon size={11} />}
                            {cfg?.label ?? e.eventType}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-[var(--foreground)] hidden sm:table-cell">{e.location}</td>
                    <td className="px-5 py-3 text-[var(--muted)]">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
