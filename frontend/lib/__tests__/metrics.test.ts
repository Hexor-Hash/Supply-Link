import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  recordOperation,
  getOperationCounts,
  recordDependency,
  getMetricsSnapshot,
} from '@/lib/api/metrics';
import { getThrottleCounts } from '@/lib/api/rateLimit';

// Reset module-level state between tests by re-importing fresh
// (vitest isolates modules per test file by default)

describe('recordOperation / getOperationCounts', () => {
  it('increments success counter', () => {
    recordOperation('product.register', 'success');
    const counts = getOperationCounts();
    expect(counts['product.register'].success).toBeGreaterThanOrEqual(1);
  });

  it('increments failure counter', () => {
    recordOperation('event.create', 'failure');
    const counts = getOperationCounts();
    expect(counts['event.create'].failure).toBeGreaterThanOrEqual(1);
  });

  it('tracks multiple operations independently', () => {
    recordOperation('wallet.connect', 'success');
    recordOperation('wallet.connect_failed', 'failure');
    const counts = getOperationCounts();
    expect(counts['wallet.connect']).toBeDefined();
    expect(counts['wallet.connect_failed']).toBeDefined();
  });
});

describe('getMetricsSnapshot includes operations', () => {
  it('snapshot contains operations field', () => {
    recordOperation('qr.scan', 'success');
    const snapshot = getMetricsSnapshot(getThrottleCounts());
    expect(snapshot).toHaveProperty('operations');
    expect(snapshot.operations['qr.scan']).toBeDefined();
  });

  it('snapshot contains collectedAt, endpoints, dependencies, throttleCounts', () => {
    const snapshot = getMetricsSnapshot({});
    expect(snapshot.collectedAt).toBeTruthy();
    expect(Array.isArray(snapshot.endpoints)).toBe(true);
    expect(Array.isArray(snapshot.dependencies)).toBe(true);
    expect(snapshot.throttleCounts).toBeDefined();
  });
});

describe('recordDependency', () => {
  it('tracks soroban-rpc availability', () => {
    recordDependency('soroban-rpc', true);
    recordDependency('soroban-rpc', false);
    const snapshot = getMetricsSnapshot({});
    const dep = snapshot.dependencies.find((d) => d.name === 'soroban-rpc');
    expect(dep).toBeDefined();
    expect(dep!.totalCalls).toBeGreaterThanOrEqual(2);
    expect(dep!.failures).toBeGreaterThanOrEqual(1);
  });
});
