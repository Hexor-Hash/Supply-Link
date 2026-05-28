"use client";

import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Package, Activity, CheckCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDashboardData } from "@/lib/hooks/useDashboardData";

const PIE_COLORS: Record<string, string> = {
  HARVEST: "#22c55e",
  PROCESSING: "#3b82f6",
  SHIPPING: "#f59e0b",
  RETAIL: "#a855f7",
};

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
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
  const t = useTranslations("dashboard");
  const { stats, dailyCounts, eventTypeCounts, recentEvents } = useDashboardData();

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("totalProducts")} value={stats.totalProducts} icon={Package} />
        <StatCard label={t("totalEvents")} value={stats.totalEvents} icon={Activity} />
        <StatCard label={t("activeProducts")} value={stats.activeProducts} icon={CheckCircle} />
        <StatCard label={t("last24h")} value={stats.recentActivity} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-4">{t("eventsPerDay")}</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyCounts}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} interval={4} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-4">{t("eventTypeDistribution")}</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={eventTypeCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {eventTypeCounts.map((entry) => (
                  <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? "#6b7280"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--card-border)]">
          <p className="text-sm font-semibold text-[var(--foreground)]">{t("recentEvents")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--card-border)]">
                <th className="px-5 py-3 font-medium">{t("product")}</th>
                <th className="px-5 py-3 font-medium">{t("type")}</th>
                <th className="px-5 py-3 font-medium">{t("location")}</th>
                <th className="px-5 py-3 font-medium">{t("time")}</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-[var(--muted)]">{t("noEvents")}</td>
                </tr>
              ) : (
                recentEvents.map((e, i) => (
                  <tr key={i} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--muted-bg)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-[var(--foreground)]">{e.productId}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: PIE_COLORS[e.eventType] ?? "#6b7280" }}>
                        {e.eventType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--foreground)]">{e.location}</td>
                    <td className="px-5 py-3 text-[var(--muted)]">{new Date(e.timestamp).toLocaleString()}</td>
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
