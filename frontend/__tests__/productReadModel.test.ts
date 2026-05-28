/**
 * Integration tests for the contract-backed product read model.
 * Covers happy path, degraded dependency (contract unavailable), and cache bypass.
 * closes #304
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/stellar/contract', () => ({
  contractClient: {
    getProduct: vi.fn(),
    getTrackingEvents: vi.fn(),
  },
}));

vi.mock('@/lib/mock/products', () => ({
  getProductById: vi.fn((id: string) =>
    id === 'mock-001'
      ? {
          id: 'mock-001',
          name: 'Mock Product',
          origin: 'Mock Origin',
          owner: 'GMOCK',
          timestamp: 1000,
          active: true,
          authorizedActors: [],
        }
      : undefined,
  ),
  getEventsByProductId: vi.fn(() => []),
  getAllProducts: vi.fn(() => []),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('productReadModel', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to clear in-process cache between tests
    vi.resetModules();
  });

  it('returns normalized on-chain product when contract succeeds', async () => {
    const { contractClient } = await import('@/lib/stellar/contract');
    vi.mocked(contractClient.getProduct).mockResolvedValueOnce({
      name: 'On-chain Coffee',
      origin: 'Ethiopia',
      owner: 'GONCHAIN',
      timestamp: 9999,
      active: true,
      authorized_actors: ['GACTOR1'],
    });

    const { getProduct } = await import('@/lib/services/productReadModel');
    const product = await getProduct('prod-001');

    expect(product).toMatchObject({
      id: 'prod-001',
      name: 'On-chain Coffee',
      origin: 'Ethiopia',
      owner: 'GONCHAIN',
      active: true,
      authorizedActors: ['GACTOR1'],
    });
  });

  it('falls back to mock when contract throws', async () => {
    const { contractClient } = await import('@/lib/stellar/contract');
    vi.mocked(contractClient.getProduct).mockRejectedValueOnce(new Error('RPC unavailable'));

    const { getProduct } = await import('@/lib/services/productReadModel');
    const product = await getProduct('mock-001');

    expect(product).toMatchObject({ id: 'mock-001', name: 'Mock Product' });
  });

  it('returns null for unknown product when contract and mock both miss', async () => {
    const { contractClient } = await import('@/lib/stellar/contract');
    vi.mocked(contractClient.getProduct).mockResolvedValueOnce(null);

    const { getProduct } = await import('@/lib/services/productReadModel');
    const product = await getProduct('unknown-id');

    expect(product).toBeNull();
  });

  it('returns normalized on-chain events', async () => {
    const { contractClient } = await import('@/lib/stellar/contract');
    vi.mocked(contractClient.getTrackingEvents).mockResolvedValueOnce([
      {
        product_id: 'prod-001',
        location: 'Addis Ababa',
        actor: 'GACTOR1',
        timestamp: 1000,
        event_type: 'HARVEST',
        metadata: '{}',
      },
    ]);

    const { getTrackingEvents } = await import('@/lib/services/productReadModel');
    const events = await getTrackingEvents('prod-001');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      productId: 'prod-001',
      location: 'Addis Ababa',
      eventType: 'HARVEST',
    });
  });

  it('falls back to mock events when contract throws', async () => {
    const { contractClient } = await import('@/lib/stellar/contract');
    vi.mocked(contractClient.getTrackingEvents).mockRejectedValueOnce(new Error('timeout'));

    const { getEventsByProductId } = await import('@/lib/mock/products');
    vi.mocked(getEventsByProductId).mockReturnValueOnce([
      {
        productId: 'prod-001',
        location: 'Mock Location',
        actor: 'GMOCK',
        timestamp: 1,
        eventType: 'HARVEST',
        metadata: '{}',
      },
    ]);

    const { getTrackingEvents } = await import('@/lib/services/productReadModel');
    const events = await getTrackingEvents('prod-001');

    expect(events[0].location).toBe('Mock Location');
  });

  it('bypassCache forces a fresh contract read', async () => {
    const { contractClient } = await import('@/lib/stellar/contract');
    vi.mocked(contractClient.getProduct)
      .mockResolvedValueOnce({ name: 'First', origin: 'A', owner: 'G1', timestamp: 1, active: true, authorized_actors: [] })
      .mockResolvedValueOnce({ name: 'Second', origin: 'B', owner: 'G2', timestamp: 2, active: true, authorized_actors: [] });

    const { getProduct } = await import('@/lib/services/productReadModel');
    const first = await getProduct('prod-001');
    const second = await getProduct('prod-001', { bypassCache: true });

    expect(first?.name).toBe('First');
    expect(second?.name).toBe('Second');
    expect(contractClient.getProduct).toHaveBeenCalledTimes(2);
  });
});
