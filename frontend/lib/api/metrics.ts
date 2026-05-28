/**
 * In-process metrics collector for API observability.
 *
 * Tracks per-endpoint:
 *   - Request count (total, by status class)
 *   - Latency histogram (p50, p95, p99)
 *   - Dependency call outcomes (RPC, KV)
 *   - Error budget consumption against SLO targets
 *
 * All data is in-memory and resets on process restart.
 * For production, flush to a time-series store (e.g., Datadog, Prometheus).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EndpointMetrics {
  endpoint: string;
  totalRequests: number;
  /** Counts by HTTP status class: "2xx" | "3xx" | "4xx" | "5xx" */
  statusCounts: Record<string, number>;
  /** Latency samples in ms (capped at 1000 samples per endpoint) */
  latencySamples: number[];
  /** Computed percentiles (populated by getMetricsSnapshot) */
  p50?: number;
  p95?: number;
  p99?: number;
  /** Error rate 0–1 */
  errorRate?: number;
  /** SLO availability 0–1 */
  availability?: number;
}

export interface DependencyMetrics {
  name: string;
  totalCalls: number;
  failures: number;
  availabilityRate: number;
}

export interface MetricsSnapshot {
  collectedAt: string;
  endpoints: EndpointMetrics[];
  dependencies: DependencyMetrics[];
  /** Throttle counts from rate limiter */
  throttleCounts: Record<string, number>;
}

// ── SLO targets ───────────────────────────────────────────────────────────────

export const SLO_TARGETS = {
  /** Minimum availability (non-5xx / total) */
  availability: 0.999,
  /** p95 latency ceiling in ms */
  p95LatencyMs: 500,
  /** p99 latency ceiling in ms */
  p99LatencyMs: 2000,
} as const;

// ── Internal store ────────────────────────────────────────────────────────────

const MAX_SAMPLES = 1000;
const endpointStore = new Map<string, EndpointMetrics>();
const dependencyStore = new Map<string, DependencyMetrics>();

function getOrCreate(endpoint: string): EndpointMetrics {
  if (!endpointStore.has(endpoint)) {
    endpointStore.set(endpoint, {
      endpoint,
      totalRequests: 0,
      statusCounts: {},
      latencySamples: [],
    });
  }
  return endpointStore.get(endpoint)!;
}

// ── Recording API ─────────────────────────────────────────────────────────────

/** Record a completed request. */
export function recordRequest(endpoint: string, statusCode: number, latencyMs: number): void {
  const m = getOrCreate(endpoint);
  m.totalRequests++;

  const cls = `${Math.floor(statusCode / 100)}xx`;
  m.statusCounts[cls] = (m.statusCounts[cls] ?? 0) + 1;

  if (m.latencySamples.length >= MAX_SAMPLES) m.latencySamples.shift();
  m.latencySamples.push(latencyMs);
}

/** Record a dependency call outcome. */
export function recordDependency(name: string, success: boolean): void {
  if (!dependencyStore.has(name)) {
    dependencyStore.set(name, { name, totalCalls: 0, failures: 0, availabilityRate: 1 });
  }
  const d = dependencyStore.get(name)!;
  d.totalCalls++;
  if (!success) d.failures++;
  d.availabilityRate = d.totalCalls > 0 ? (d.totalCalls - d.failures) / d.totalCalls : 1;
}

// ── Percentile calculation ────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

/** Build a point-in-time snapshot with computed percentiles and error rates. */
export function getMetricsSnapshot(throttleCounts: Record<string, number>): MetricsSnapshot {
  const endpoints: EndpointMetrics[] = [];

  for (const m of endpointStore.values()) {
    const sorted = [...m.latencySamples].sort((a, b) => a - b);
    const errors5xx = m.statusCounts['5xx'] ?? 0;
    const errorRate = m.totalRequests > 0 ? errors5xx / m.totalRequests : 0;

    endpoints.push({
      ...m,
      latencySamples: [], // omit raw samples from snapshot
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      errorRate,
      availability: 1 - errorRate,
    });
  }

  return {
    collectedAt: new Date().toISOString(),
    endpoints,
    dependencies: Array.from(dependencyStore.values()),
    throttleCounts,
  };
}

// ── Instrumentation helper ────────────────────────────────────────────────────

/**
 * Wrap a route handler to automatically record latency and status code.
 *
 * Usage:
 *   export async function GET(request: NextRequest) {
 *     return withMetrics("health", request, async () => { ... });
 *   }
 */
export async function withMetrics<T extends { status: number }>(
  endpoint: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  const response = await fn();
  recordRequest(endpoint, response.status, Date.now() - start);
  return response;
}
