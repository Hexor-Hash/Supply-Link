/**
 * Tests for the replay-proof ratings signature protocol.
 * Covers: canonical format, expiry, nonce replay, duplicate submission.
 * closes #306
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildRatingMessage,
  parseAndValidateMessage,
  consumeNonce,
  hasDuplicateRating,
  recordRating,
  EXPIRY_WINDOW_MS,
} from '@/lib/api/ratingsProtocol';

// ── Mock KV ───────────────────────────────────────────────────────────────────

const store = new Map<string, string>();

vi.mock('@/lib/kv', () => ({
  kvStore: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    del: vi.fn(async (k: string) => { store.delete(k); }),
  },
}));

beforeEach(() => store.clear());

// ── buildRatingMessage ────────────────────────────────────────────────────────

describe('buildRatingMessage', () => {
  it('produces the canonical format', () => {
    const msg = buildRatingMessage({ productId: 'prod-1', stars: 5, nonce: 'abc', expiresAt: 9999 });
    expect(msg).toBe('supply-link:rate:prod-1:5:abc:9999');
  });
});

// ── parseAndValidateMessage ───────────────────────────────────────────────────

describe('parseAndValidateMessage', () => {
  function validMsg(overrides: Partial<{ productId: string; stars: number; nonce: string; expiresAt: number }> = {}) {
    const expiresAt = overrides.expiresAt ?? Date.now() + 60_000;
    return buildRatingMessage({
      productId: overrides.productId ?? 'prod-1',
      stars: overrides.stars ?? 4,
      nonce: overrides.nonce ?? 'nonce123',
      expiresAt,
    });
  }

  it('accepts a valid message', () => {
    const result = parseAndValidateMessage(validMsg(), 'prod-1', 4);
    expect(result.ok).toBe(true);
  });

  it('rejects wrong domain prefix', () => {
    const result = parseAndValidateMessage('other-app:rate:prod-1:4:n:' + (Date.now() + 60000), 'prod-1', 4);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('invalid_format');
  });

  it('rejects mismatched productId', () => {
    const result = parseAndValidateMessage(validMsg({ productId: 'prod-2' }), 'prod-1', 4);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('product_id_mismatch');
  });

  it('rejects mismatched stars', () => {
    const result = parseAndValidateMessage(validMsg({ stars: 3 }), 'prod-1', 4);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('stars_mismatch');
  });

  it('rejects expired message', () => {
    const result = parseAndValidateMessage(validMsg({ expiresAt: Date.now() - 1 }), 'prod-1', 4);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('expired');
  });

  it('rejects expiry too far in the future', () => {
    const result = parseAndValidateMessage(
      validMsg({ expiresAt: Date.now() + EXPIRY_WINDOW_MS + 10_000 }),
      'prod-1',
      4,
    );
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('expiry_too_far');
  });

  it('rejects tampered payload (modified stars in message)', () => {
    const msg = validMsg({ stars: 5 });
    const tampered = msg.replace(':5:', ':1:');
    const result = parseAndValidateMessage(tampered, 'prod-1', 5);
    expect(result.ok).toBe(false);
  });
});

// ── consumeNonce ──────────────────────────────────────────────────────────────

describe('consumeNonce', () => {
  it('allows first use of a nonce', async () => {
    const ok = await consumeNonce('GWALLET1', 'nonce-fresh');
    expect(ok).toBe(true);
  });

  it('rejects replay of the same nonce', async () => {
    await consumeNonce('GWALLET2', 'nonce-replay');
    const ok = await consumeNonce('GWALLET2', 'nonce-replay');
    expect(ok).toBe(false);
  });

  it('allows same nonce for different wallets', async () => {
    await consumeNonce('GWALLET3', 'shared-nonce');
    const ok = await consumeNonce('GWALLET4', 'shared-nonce');
    expect(ok).toBe(true);
  });
});

// ── duplicate rating ──────────────────────────────────────────────────────────

describe('hasDuplicateRating / recordRating', () => {
  it('returns false before any rating', async () => {
    expect(await hasDuplicateRating('GWALLET5', 'prod-x')).toBe(false);
  });

  it('returns true after recording a rating', async () => {
    await recordRating('GWALLET6', 'prod-y');
    expect(await hasDuplicateRating('GWALLET6', 'prod-y')).toBe(true);
  });

  it('does not affect other wallet-product pairs', async () => {
    await recordRating('GWALLET7', 'prod-z');
    expect(await hasDuplicateRating('GWALLET8', 'prod-z')).toBe(false);
    expect(await hasDuplicateRating('GWALLET7', 'prod-other')).toBe(false);
  });
});
