'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';

interface EndpointMetrics {
  endpoint: string;
  totalRequests: number;
  statusCounts: Record<string, number>;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  availability: number;
  slo: {
    availabilityTarget: number;
    p95LatencyTarget: number;
    p99LatencyTarget: number;
    availabilityBreached: boolean;
    p95Breached: boolean;
    p99Breached: boolean;
  };
}

interface DependencyMetrics {
  name: string;
  totalCalls: number;
  failures: number;
  availabilityRate: number;
}

interface MetricsData {
  collectedAt: string;
  endpoints: EndpointMetrics[];
  dependencies: DependencyMetrics[];
  throttleCounts: Record<string, number>;
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function ms(n: number) {
  return `${n.toFixed(0)} ms`;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {ok ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
      {label}
    </span>
  );
}

export default function ObservabilityPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 15_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-[var(--muted)]">Loading metrics…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-6">
        <p className="text-red-500">Failed to load metrics: {error}</p>
      </main>
    );
  }

  const totalThrottles = Object.values(data.throttleCounts).reduce((s, v) => s + v, 0);

  return (
    <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">API Observability</h1>
        <span className="text-xs text-[var(--muted)]">
          Updated {new Date(data.collectedAt).toLocaleTimeString()} · auto-refreshes every 15 s
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Endpoints tracked',
            value: data.endpoints.length,
            icon: Activity,
          },
          {
            label: 'Total requests',
            value: data.endpoints.reduce((s, e) => s + e.totalRequests, 0),
            icon: Zap,
          },
          {
            label: 'SLO breaches',
            value: data.endpoints.filter(
              (e) => e.slo.availabilityBreached || e.slo.p95Breached || e.slo.p99Breached,
            ).length,
            icon: AlertTriangle,
          },
          {
            label: 'Throttled requests',
            value: totalThrottles,
            icon: Clock,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="p-2 rounded-lg bg-[var(--muted-bg)]">
              <Icon size={20} className="text-[var(--foreground)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">{label}</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Endpoint SLI table */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Endpoint SLIs</h2>
        {data.endpoints.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">No requests recorded yet.</p>
        ) : (
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--card-border)]">
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Requests</th>
                  <th className="px-4 py-3 font-medium">Availability</th>
                  <th className="px-4 py-3 font-medium">p50</th>
                  <th className="px-4 py-3 font-medium">p95</th>
                  <th className="px-4 py-3 font-medium">p99</th>
                  <th className="px-4 py-3 font-medium">SLO</th>
                </tr>
              </thead>
              <tbody>
                {data.endpoints.map((e) => {
                  const sloOk =
                    !e.slo.availabilityBreached && !e.slo.p95Breached && !e.slo.p99Breached;
                  return (
                    <tr
                      key={e.endpoint}
                      className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--muted-bg)] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">{e.endpoint}</td>
                      <td className="px-4 py-3">{e.totalRequests}</td>
                      <td className="px-4 py-3">
                        <span
                          className={e.slo.availabilityBreached ? 'text-red-500' : 'text-green-600'}
                        >
                          {pct(e.availability)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{ms(e.p50)}</td>
                      <td className="px-4 py-3">
                        <span className={e.slo.p95Breached ? 'text-red-500' : ''}>{ms(e.p95)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={e.slo.p99Breached ? 'text-red-500' : ''}>{ms(e.p99)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge ok={sloOk} label={sloOk ? 'OK' : 'BREACH'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dependency health */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Dependency Health</h2>
        {data.dependencies.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">No dependency calls recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.dependencies.map((d) => (
              <div
                key={d.name}
                className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-[var(--foreground)]">{d.name}</span>
                  <StatusBadge ok={d.availabilityRate >= 0.99} label={pct(d.availabilityRate)} />
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {d.totalCalls} calls · {d.failures} failures
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Throttle counters */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Rate Limit Counters</h2>
        {Object.keys(data.throttleCounts).length === 0 ? (
          <p className="text-[var(--muted)] text-sm">No throttled requests recorded.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(data.throttleCounts).map(([endpoint, count]) => (
              <div
                key={endpoint}
                className="border border-[var(--card-border)] bg-[var(--card)] rounded-lg p-3 shadow-sm"
              >
                <p className="text-xs font-mono text-[var(--muted)] truncate">{endpoint}</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{count}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
