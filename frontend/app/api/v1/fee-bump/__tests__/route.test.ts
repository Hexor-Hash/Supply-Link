import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const fromSecret = vi.fn();
const fromXDR = vi.fn();
const buildFeeBumpTransaction = vi.fn();
const sign = vi.fn();

vi.mock('@/lib/api/cors', () => ({
  withCors: (_req: NextRequest, res: NextResponse) => res,
  handleOptions: () => new NextResponse(null, { status: 204 }),
}));

vi.mock('@/lib/api/rateLimit', () => ({
  applyRateLimit: vi.fn(() => null),
  RATE_LIMIT_PRESETS: {
    feeBump: {},
  },
}));

vi.mock('@/lib/api/idempotency', () => ({
  withIdempotency: async (
    request: NextRequest,
    handler: (req: NextRequest, rawBody: string) => Promise<NextResponse>,
  ) => handler(request, await request.text()),
}));

vi.mock('@/lib/api/policy', () => ({
  requirePolicy:
    (_tier: string, handler: (req: NextRequest) => Promise<NextResponse>) =>
    async (req: NextRequest) =>
      handler(req),
}));

vi.mock('@stellar/stellar-sdk', () => ({
  BASE_FEE: 100,
  Networks: {
    TESTNET: 'Test Network',
  },
  Keypair: {
    fromSecret,
  },
  TransactionBuilder: {
    fromXDR,
    buildFeeBumpTransaction,
  },
}));

describe('fee-bump route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STELLAR_FEE_BUMP_SECRET = 'SA3DUMMYSECRET';

    fromSecret.mockReturnValue({ publicKey: vi.fn(() => 'GTESTPUBLIC') });
    fromXDR.mockReturnValue({ operations: [{ type: 'invoke' }] });
    buildFeeBumpTransaction.mockReturnValue({
      sign,
      toXDR: () => 'AAAABUILT',
    });
  });

  it('rejects invalid JSON before parsing XDR', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/v1/fee-bump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"innerTx":',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
    expect(fromXDR).not.toHaveBeenCalled();
  });

  it('rejects unsupported content types before parsing XDR', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/v1/fee-bump', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ innerTx: 'AAAA' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error.code).toBe('UNSUPPORTED_CONTENT_TYPE');
    expect(fromXDR).not.toHaveBeenCalled();
  });

  it('accepts a valid fee-bump request', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/v1/fee-bump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ innerTx: 'AAAA' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.feeBumpTx).toBe('AAAABUILT');
    expect(body.cost).toBe('200');
    expect(fromXDR).toHaveBeenCalledOnce();
    expect(buildFeeBumpTransaction).toHaveBeenCalledOnce();
  });
});
