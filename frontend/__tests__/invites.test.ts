/**
 * Tests for invite creation, redemption, expiration, and revocation.
 * Uses the in-memory KV store (no env vars set).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  body?: unknown,
  url = 'http://localhost/api/invites',
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Reset in-memory KV between tests
beforeEach(async () => {
  // Clear the module-level memStore by re-importing with a fresh module cache
  vi.resetModules();
});

// ── POST /api/invites ─────────────────────────────────────────────────────────

describe('POST /api/invites — create invite', () => {
  it('creates an invite and returns token + inviteUrl', async () => {
    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest('POST', { productId: 'prod-1' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.token).toBe('string');
    expect(body.token).toHaveLength(64); // 32 bytes hex
    expect(body.inviteUrl).toContain(body.token);
    expect(body.role).toBe('actor');
    expect(body.expiresIn).toBe(86_400);
  });

  it('respects custom role and expiresInSeconds', async () => {
    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(
      makeRequest('POST', { productId: 'prod-1', role: 'viewer', expiresInSeconds: 3600 }),
    );
    const body = await res.json();
    expect(body.role).toBe('viewer');
    expect(body.expiresIn).toBe(3600);
  });

  it('caps expiresInSeconds at 7 days', async () => {
    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(
      makeRequest('POST', { productId: 'prod-1', expiresInSeconds: 999_999_999 }),
    );
    const body = await res.json();
    expect(body.expiresIn).toBe(60 * 60 * 24 * 7);
  });

  it('returns 400 when productId is missing', async () => {
    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest('POST', {}));
    expect(res.status).toBe(400);
  });

  it('generates unique tokens for each call', async () => {
    const { POST } = await import('@/app/api/invites/route');
    const [r1, r2] = await Promise.all([
      POST(makeRequest('POST', { productId: 'prod-1' })),
      POST(makeRequest('POST', { productId: 'prod-1' })),
    ]);
    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
    expect(b1.token).not.toBe(b2.token);
  });
});

// ── GET /api/invites/[token] ──────────────────────────────────────────────────

describe('GET /api/invites/[token] — validate invite', () => {
  it('returns productId and role for a valid token', async () => {
    const { POST } = await import('@/app/api/invites/route');
    const { GET } = await import('@/app/api/invites/[token]/route');

    const created = await (await POST(makeRequest('POST', { productId: 'prod-2' }))).json();
    const res = await GET(
      makeRequest('GET', undefined, `http://localhost/api/invites/${created.token}`),
      { params: Promise.resolve({ token: created.token }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.productId).toBe('prod-2');
    expect(body.role).toBe('actor');
  });

  it('returns 404 for unknown token', async () => {
    const { GET } = await import('@/app/api/invites/[token]/route');
    const res = await GET(
      makeRequest('GET', undefined, 'http://localhost/api/invites/nonexistent'),
      { params: Promise.resolve({ token: 'nonexistent' }) },
    );
    expect(res.status).toBe(404);
  });
});

// ── POST /api/invites/[token]/redeem ─────────────────────────────────────────

describe('POST /api/invites/[token]/redeem — redeem invite', () => {
  it('redeems a valid token and binds wallet address', async () => {
    const { POST: createInvite } = await import('@/app/api/invites/route');
    const { POST: redeemInvite } = await import('@/app/api/invites/[token]/redeem/route');

    const created = await (await createInvite(makeRequest('POST', { productId: 'prod-3' }))).json();
    const res = await redeemInvite(
      makeRequest(
        'POST',
        { walletAddress: 'GTEST123' },
        `http://localhost/api/invites/${created.token}/redeem`,
      ),
      { params: Promise.resolve({ token: created.token }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.productId).toBe('prod-3');
    expect(body.redeemedBy).toBe('GTEST123');
  });

  it('returns 410 when token is reused', async () => {
    const { POST: createInvite } = await import('@/app/api/invites/route');
    const { POST: redeemInvite } = await import('@/app/api/invites/[token]/redeem/route');

    const created = await (await createInvite(makeRequest('POST', { productId: 'prod-4' }))).json();
    const params = { params: Promise.resolve({ token: created.token }) };
    const req = () =>
      makeRequest(
        'POST',
        { walletAddress: 'GTEST456' },
        `http://localhost/api/invites/${created.token}/redeem`,
      );

    await redeemInvite(req(), params);
    const second = await redeemInvite(req(), params);
    expect(second.status).toBe(410);
  });

  it('returns 404 for unknown token', async () => {
    const { POST: redeemInvite } = await import('@/app/api/invites/[token]/redeem/route');
    const res = await redeemInvite(
      makeRequest('POST', { walletAddress: 'GTEST789' }, 'http://localhost/api/invites/bad/redeem'),
      { params: Promise.resolve({ token: 'bad' }) },
    );
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/invites/[token] — revoke ──────────────────────────────────────

describe('DELETE /api/invites/[token] — revoke invite', () => {
  it('revokes a token so it can no longer be redeemed', async () => {
    const { POST: createInvite } = await import('@/app/api/invites/route');
    const { DELETE: revokeInvite } = await import('@/app/api/invites/[token]/route');
    const { POST: redeemInvite } = await import('@/app/api/invites/[token]/redeem/route');

    const created = await (await createInvite(makeRequest('POST', { productId: 'prod-5' }))).json();
    const tokenParam = { params: Promise.resolve({ token: created.token }) };

    const revokeRes = await revokeInvite(
      makeRequest('DELETE', undefined, `http://localhost/api/invites/${created.token}`),
      tokenParam,
    );
    expect(revokeRes.status).toBe(200);
    expect((await revokeRes.json()).revoked).toBe(true);

    // Attempting to redeem a revoked token should fail
    const redeemRes = await redeemInvite(
      makeRequest(
        'POST',
        { walletAddress: 'GTEST000' },
        `http://localhost/api/invites/${created.token}/redeem`,
      ),
      tokenParam,
    );
    expect(redeemRes.status).toBe(410);
  });

  it('returns 404 when revoking an unknown token', async () => {
    const { DELETE: revokeInvite } = await import('@/app/api/invites/[token]/route');
    const res = await revokeInvite(
      makeRequest('DELETE', undefined, 'http://localhost/api/invites/ghost'),
      { params: Promise.resolve({ token: 'ghost' }) },
    );
    expect(res.status).toBe(404);
  });
});

// ── GET /api/invites?productId — list invites ─────────────────────────────────

describe('GET /api/invites — list invites for a product', () => {
  it('lists all tokens created for a product', async () => {
    const { POST: createInvite, GET: listInvites } = await import('@/app/api/invites/route');

    await createInvite(makeRequest('POST', { productId: 'prod-list' }));
    await createInvite(makeRequest('POST', { productId: 'prod-list' }));

    const res = await listInvites(
      makeRequest('GET', undefined, 'http://localhost/api/invites?productId=prod-list'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invites.length).toBeGreaterThanOrEqual(2);
    expect(body.invites.every((i: { productId: string }) => i.productId === 'prod-list')).toBe(
      true,
    );
  });

  it('returns 400 when productId is missing', async () => {
    const { GET: listInvites } = await import('@/app/api/invites/route');
    const res = await listInvites(makeRequest('GET', undefined, 'http://localhost/api/invites'));
    expect(res.status).toBe(400);
  });
});
