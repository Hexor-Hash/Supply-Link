import { describe, it, expect } from 'vitest';
import {
  recordRequest,
  recordDependency,
  getMetricsSnapshot,
  withMetrics,
  SLO_TARGETS,
} from '@/lib/api/metrics';
import { NextResponse } from 'next/server';

// Each test uses a unique endpoint name to avoid cross-test state

describe('recordRequest / getMetricsSnapshot', () => {
  it('records request counts and status classes', () => {
    const ep = `ep-count-${Math.random()}`;
    recordRequest(ep, 200, 50);
    recordRequest(ep, 201, 60);
    recordRequest(ep, 500, 100);

    const snap = getMetricsSnapshot({});
    const m = snap.endpoints.find((e) => e.endpoint === ep)!;
    expect(m.totalRequests).toBe(3);
    expect(m.statusCounts['2xx']).toBe(2);
    expect(m.statusCounts['5xx']).toBe(1);
  });

  it('computes latency percentiles', () => {
    const ep = `ep-latency-${Math.random()}`;
    // 10 samples: 10, 20, ..., 100
    for (let i = 1; i <= 10; i++) recordRequest(ep, 200, i * 10);

    const snap = getMetricsSnapshot({});
    const m = snap.endpoints.find((e) => e.endpoint === ep)!;
    expect(m.p50).toBeGreaterThan(0);
    expect(m.p95).toBeGreaterThanOrEqual(m.p50!);
    expect(m.p99).toBeGreaterThanOrEqual(m.p95!);
  });

  it('computes error rate correctly', () => {
    const ep = `ep-err-${Math.random()}`;
    recordRequest(ep, 200, 10);
    recordRequest(ep, 200, 10);
    recordRequest(ep, 500, 10);

    const snap = getMetricsSnapshot({});
    const m = snap.endpoints.find((e) => e.endpoint === ep)!;
    expect(m.errorRate).toBeCloseTo(1 / 3, 5);
    expect(m.availability).toBeCloseTo(2 / 3, 5);
  });

  it('includes throttle counts in snapshot', () => {
    const snap = getMetricsSnapshot({ ratings: 5, upload: 2 });
    expect(snap.throttleCounts.ratings).toBe(5);
    expect(snap.throttleCounts.upload).toBe(2);
  });

  it('omits raw latency samples from snapshot', () => {
    const ep = `ep-samples-${Math.random()}`;
    recordRequest(ep, 200, 42);
    const snap = getMetricsSnapshot({});
    const m = snap.endpoints.find((e) => e.endpoint === ep)!;
    expect(m.latencySamples).toHaveLength(0);
  });
});

describe('recordDependency', () => {
  it('tracks availability rate', () => {
    const dep = `dep-${Math.random()}`;
    recordDependency(dep, true);
    recordDependency(dep, true);
    recordDependency(dep, false);

    const snap = getMetricsSnapshot({});
    const d = snap.dependencies.find((x) => x.name === dep)!;
    expect(d.totalCalls).toBe(3);
    expect(d.failures).toBe(1);
    expect(d.availabilityRate).toBeCloseTo(2 / 3, 5);
  });
});

describe('withMetrics', () => {
  it('records the response status and returns the response', async () => {
    const ep = `ep-wrap-${Math.random()}`;
    const res = await withMetrics(ep, async () => NextResponse.json({ ok: true }, { status: 200 }));
    expect(res.status).toBe(200);

    const snap = getMetricsSnapshot({});
    const m = snap.endpoints.find((e) => e.endpoint === ep)!;
    expect(m.totalRequests).toBe(1);
    expect(m.statusCounts['2xx']).toBe(1);
  });
});

describe('SLO_TARGETS', () => {
  it('defines availability, p95, and p99 targets', () => {
    expect(SLO_TARGETS.availability).toBeGreaterThan(0.99);
    expect(SLO_TARGETS.p95LatencyMs).toBeGreaterThan(0);
    expect(SLO_TARGETS.p99LatencyMs).toBeGreaterThan(SLO_TARGETS.p95LatencyMs);
  });
});
