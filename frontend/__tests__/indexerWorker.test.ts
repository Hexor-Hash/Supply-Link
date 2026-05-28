import { describe, it, expect, beforeEach } from 'vitest';
import {
  indexEvent,
  indexEvents,
  getEventsByProduct,
  searchEvents,
  getCursor,
  setCursor,
  memEvents,
  memProductKeys,
  _resetMemStore,
} from '@/lib/indexer/eventIndex';
import type { ParsedEvent } from '@/docs/indexing/reference-parser';
import { SAMPLE_EVENTS } from '@/docs/indexing/sample-dataset';

beforeEach(() => {
  _resetMemStore();
});

// ── indexEvent ────────────────────────────────────────────────────────────────

describe('indexEvent', () => {
  it('stores an event and makes it retrievable', async () => {
    await indexEvent(SAMPLE_EVENTS[0]);
    const events = await getEventsByProduct('batch-2024-001');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('product_registered');
  });

  it('is idempotent — duplicate events are not double-indexed', async () => {
    await indexEvent(SAMPLE_EVENTS[0]);
    await indexEvent(SAMPLE_EVENTS[0]);
    const events = await getEventsByProduct('batch-2024-001');
    expect(events).toHaveLength(1);
  });

  it('indexes events from multiple products independently', async () => {
    const other: ParsedEvent = {
      ...SAMPLE_EVENTS[0],
      productId: 'other-product',
      txHash: 'zz0001',
    };
    await indexEvent(SAMPLE_EVENTS[0]);
    await indexEvent(other);

    expect(await getEventsByProduct('batch-2024-001')).toHaveLength(1);
    expect(await getEventsByProduct('other-product')).toHaveLength(1);
  });
});

// ── indexEvents (batch) ───────────────────────────────────────────────────────

describe('indexEvents', () => {
  it('indexes all sample events', async () => {
    await indexEvents(SAMPLE_EVENTS);
    const events = await getEventsByProduct('batch-2024-001');
    expect(events).toHaveLength(SAMPLE_EVENTS.length);
  });

  it('handles empty array without error', async () => {
    await expect(indexEvents([])).resolves.toBeUndefined();
  });
});

// ── cursor ────────────────────────────────────────────────────────────────────

describe('cursor', () => {
  it('starts at 0', async () => {
    expect(await getCursor()).toBe(0);
  });

  it('advances after setCursor', async () => {
    await setCursor(42);
    expect(await getCursor()).toBe(42);
  });

  it('survives multiple updates', async () => {
    await setCursor(10);
    await setCursor(20);
    expect(await getCursor()).toBe(20);
  });
});

// ── recovery after restart ────────────────────────────────────────────────────

describe('recovery after restart', () => {
  it('re-indexing the same events after a reset does not duplicate', async () => {
    await indexEvents(SAMPLE_EVENTS);
    _resetMemStore(); // simulate restart
    await indexEvents(SAMPLE_EVENTS); // replay
    const events = await getEventsByProduct('batch-2024-001');
    expect(events).toHaveLength(SAMPLE_EVENTS.length);
  });
});

// ── searchEvents ──────────────────────────────────────────────────────────────

describe('searchEvents', () => {
  beforeEach(async () => {
    await indexEvents(SAMPLE_EVENTS);
  });

  it('returns all events for a productId', async () => {
    const results = await searchEvents({ productId: 'batch-2024-001' });
    expect(results).toHaveLength(SAMPLE_EVENTS.length);
  });

  it('filters by eventType', async () => {
    const results = await searchEvents({ productId: 'batch-2024-001', eventType: 'event_added' });
    expect(results.every((e) => e.type === 'event_added')).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters by text (full-text)', async () => {
    const results = await searchEvents({ productId: 'batch-2024-001', text: 'Rotterdam' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters by location substring', async () => {
    const results = await searchEvents({ productId: 'batch-2024-001', location: 'rotterdam' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown productId', async () => {
    const results = await searchEvents({ productId: 'nonexistent' });
    expect(results).toHaveLength(0);
  });

  it('returns empty array when text does not match', async () => {
    const results = await searchEvents({ productId: 'batch-2024-001', text: 'zzznomatch' });
    expect(results).toHaveLength(0);
  });
});
