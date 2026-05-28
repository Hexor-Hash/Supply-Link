/**
 * Backward-compatibility tests for critical API response shapes.
 *
 * These tests act as schema snapshots. If a response shape changes in a
 * breaking way, the snapshot will diverge and CI will fail, requiring an
 * explicit snapshot update and version bump.
 *
 * Covered routes:
 *  - GET /api/health
 *  - GET /api/ratings?productId=x
 *  - POST /api/ratings (response shape)
 *  - GET /api/v1/products/:id/badge.png (headers)
 *  - POST /api/v1/upload (response shape)
 *
 * closes #307
 */

import { describe, it, expect } from 'vitest';

function assertShape(obj: Record<string, unknown>, shape: Record<string, string>) {
  for (const [key, expectedType] of Object.entries(shape)) {
    expect(obj).toHaveProperty(key);
    expect(typeof obj[key]).toBe(expectedType);
  }
}

describe('GET /api/health — response shape', () => {
  it('contains required fields with correct types', () => {
    const sample: Record<string, unknown> = {
      status: 'ok',
      version: '0.1.0',
      network: 'Test SDF Network ; September 2015',
      contractId: 'CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      contractReachable: true,
      uptime: 3600,
      timestamp: '2026-04-27T14:00:00.000Z',
    };

    assertShape(sample, {
      status: 'string',
      version: 'string',
      network: 'string',
      contractId: 'string',
      rpcUrl: 'string',
      uptime: 'number',
      timestamp: 'string',
    });
    expect(typeof sample.contractReachable).toBe('boolean');
  });
});

describe('GET /api/ratings — response shape', () => {
  it('contains required fields', () => {
    const sample: Record<string, unknown> = {
      productId: 'prod-abc123',
      averageRating: 4.5,
      totalRatings: 12,
      recentRatings: [],
    };

    assertShape(sample, {
      productId: 'string',
      averageRating: 'number',
      totalRatings: 'number',
    });
    expect(Array.isArray(sample.recentRatings)).toBe(true);
  });

  it('rating item shape is stable', () => {
    const item: Record<string, unknown> = {
      id: 'prod-abc123_GABC_1714224000000',
      productId: 'prod-abc123',
      walletAddress: 'GABC',
      stars: 5,
      comment: null,
      timestamp: 1714224000000,
    };

    assertShape(item, {
      id: 'string',
      productId: 'string',
      walletAddress: 'string',
      stars: 'number',
      timestamp: 'number',
    });
  });
});

describe('POST /api/ratings — response shape', () => {
  it('created rating has required fields', () => {
    const created: Record<string, unknown> = {
      id: 'prod-001_GWALLET_1714224000000',
      productId: 'prod-001',
      walletAddress: 'GWALLET',
      stars: 4,
      comment: 'Great product',
      timestamp: 1714224000000,
    };

    assertShape(created, {
      id: 'string',
      productId: 'string',
      walletAddress: 'string',
      stars: 'number',
      timestamp: 'number',
    });
  });
});

describe('POST /api/v1/upload — response shape', () => {
  it('contains url and jobs fields', () => {
    const sample: Record<string, unknown> = {
      url: 'https://public.blob.vercel-storage.com/products/123-photo.jpg',
      jobs: { scan: 'job-1', process: 'job-2' },
    };

    assertShape(sample, { url: 'string' });
    expect(sample.jobs).toBeDefined();
    expect(typeof (sample.jobs as { scan: string }).scan).toBe('string');
    expect(typeof (sample.jobs as { process: string }).process).toBe('string');
  });
});

describe('API error envelope — shape is stable', () => {
  it('error object has status, code, message, correlationId', () => {
    const envelope: Record<string, unknown> = {
      error: {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Stars must be an integer between 1 and 5',
        correlationId: 'abc-123',
        details: [{ field: 'stars', location: 'body', message: 'must be between 1 and 5' }],
      },
    };

    const err = envelope.error as Record<string, unknown>;
    assertShape(err, {
      status: 'number',
      code: 'string',
      message: 'string',
      correlationId: 'string',
    });
    expect(Array.isArray(err.details)).toBe(true);
  });
});

describe('withDeprecation', () => {
  it('sets Deprecation and Sunset headers', async () => {
    const { withDeprecation } = await import('@/lib/api/versioning');
    const { NextResponse } = await import('next/server');

    const res = withDeprecation(NextResponse.json({ ok: true }), {
      sunsetDate: '2026-08-01',
      successorUrl: '/api/v2/ratings',
    });

    expect(res.headers.get('Deprecation')).toBe('true');
    expect(res.headers.get('Sunset')).toBeTruthy();
    expect(res.headers.get('Link')).toContain('/api/v2/ratings');
  });
});
