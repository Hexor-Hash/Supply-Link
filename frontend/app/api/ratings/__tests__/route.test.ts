import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const verifySignature = vi.fn();
const kvGet = vi.fn();
const kvSet = vi.fn();
const consumeNonce = vi.fn();
const hasDuplicateRating = vi.fn();
const recordRating = vi.fn();
const parseAndValidateMessage = vi.fn();

vi.mock('@vercel/kv', () => ({
  kv: {
    get: kvGet,
    set: kvSet,
  },
}));

vi.mock('@/lib/stellar/verify', () => ({
  verifySignature,
}));

vi.mock('@/lib/api/cors', () => ({
  withCors: (_req: NextRequest, res: NextResponse) => res,
  handleOptions: () => new NextResponse(null, { status: 204 }),
}));

vi.mock('@/lib/api/rateLimit', () => ({
  applyRateLimit: vi.fn(() => null),
  RATE_LIMIT_PRESETS: {
    ratings: {},
    default: {},
  },
}));

vi.mock('@/lib/api/idempotency', () => ({
  withIdempotency: async (
    request: NextRequest,
    handler: (req: NextRequest, rawBody: string) => Promise<NextResponse>,
  ) => handler(request, await request.text()),
}));

vi.mock('@/lib/api/metrics', () => ({
  withMetrics: async (_endpoint: string, fn: () => Promise<NextResponse>) => fn(),
  recordDependency: vi.fn(),
}));

vi.mock('@/lib/api/ratingsProtocol', () => ({
  parseAndValidateMessage,
  consumeNonce,
  hasDuplicateRating,
  recordRating,
}));

describe('ratings route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseAndValidateMessage.mockReturnValue({ ok: true });
    consumeNonce.mockResolvedValue(true);
    hasDuplicateRating.mockResolvedValue(false);
    recordRating.mockResolvedValue(undefined);
    kvGet.mockResolvedValue([]);
    kvSet.mockResolvedValue(undefined);
    verifySignature.mockResolvedValue(true);
  });

  it('rejects invalid JSON before signature verification', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"productId":',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
    expect(verifySignature).not.toHaveBeenCalled();
  });

  it('rejects unsupported content types before signature verification', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ productId: 'prod-1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error.code).toBe('UNSUPPORTED_CONTENT_TYPE');
    expect(verifySignature).not.toHaveBeenCalled();
  });

  it('rejects invalid query params before reading ratings from KV', async () => {
    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost/api/ratings');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productId', location: 'query' }),
      ]),
    );
    expect(kvGet).not.toHaveBeenCalled();
  });

  it('accepts a valid rating payload', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 'prod-1',
        walletAddress: 'GTESTWALLET',
        stars: 5,
        comment: 'Great',
        message: 'supply-link:rate:prod-1:5:nonce-1:9999999999999',
        signature: 'deadbeef',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.productId).toBe('prod-1');
    expect(verifySignature).toHaveBeenCalledOnce();
    expect(kvSet).toHaveBeenCalledOnce();
  });
});
