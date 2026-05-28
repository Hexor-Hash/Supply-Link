/**
 * Replay-proof signature protocol for the Ratings API.
 *
 * Canonical signed message format:
 *   supply-link:rate:<productId>:<stars>:<nonce>:<expiresAt>
 *
 * Rules enforced server-side:
 *  - Message must match the canonical format exactly (domain separation)
 *  - expiresAt must be in the future (max EXPIRY_WINDOW_MS from now)
 *  - nonce must not have been consumed before (one-time use per wallet+action scope)
 *  - One rating per wallet per product (configurable)
 *
 * closes #306
 */

import { kvStore } from '@/lib/kv';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum age of a signed message before it is considered stale. */
export const EXPIRY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** How long to retain consumed nonces (must be >= EXPIRY_WINDOW_MS). */
const NONCE_TTL_SECONDS = 600; // 10 minutes

// ── Canonical message ─────────────────────────────────────────────────────────

export interface RatingSigningPayload {
  productId: string;
  stars: number;
  nonce: string;
  expiresAt: number; // Unix ms
}

/**
 * Build the canonical message string that the wallet must sign.
 * Clients must sign exactly this string.
 */
export function buildRatingMessage(payload: RatingSigningPayload): string {
  return `supply-link:rate:${payload.productId}:${payload.stars}:${payload.nonce}:${payload.expiresAt}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Parse and validate the signed message against the canonical format.
 * Does NOT verify the cryptographic signature — that is done by verifySignature().
 */
export function parseAndValidateMessage(
  message: string,
  expectedProductId: string,
  expectedStars: number,
): ValidationResult {
  const parts = message.split(':');
  // supply-link : rate : <productId> : <stars> : <nonce> : <expiresAt>
  if (parts.length !== 6 || parts[0] !== 'supply-link' || parts[1] !== 'rate') {
    return { ok: false, reason: 'invalid_format' };
  }

  const [, , productId, starsStr, , expiresAtStr] = parts;

  if (productId !== expectedProductId) {
    return { ok: false, reason: 'product_id_mismatch' };
  }

  const stars = parseInt(starsStr, 10);
  if (isNaN(stars) || stars !== expectedStars) {
    return { ok: false, reason: 'stars_mismatch' };
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) {
    return { ok: false, reason: 'invalid_expiry' };
  }

  const now = Date.now();
  if (expiresAt <= now) {
    return { ok: false, reason: 'expired' };
  }

  if (expiresAt > now + EXPIRY_WINDOW_MS) {
    return { ok: false, reason: 'expiry_too_far' };
  }

  return { ok: true };
}

// ── Nonce management ──────────────────────────────────────────────────────────

function nonceKey(walletAddress: string, nonce: string): string {
  return `nonce:rate:${walletAddress}:${nonce}`;
}

/**
 * Consume a nonce for a wallet address.
 * Returns false if the nonce was already consumed (replay detected).
 */
export async function consumeNonce(walletAddress: string, nonce: string): Promise<boolean> {
  const key = nonceKey(walletAddress, nonce);
  const existing = await kvStore.get(key);
  if (existing !== null) return false; // already used
  await kvStore.set(key, '1', NONCE_TTL_SECONDS);
  return true;
}

// ── Duplicate submission policy ───────────────────────────────────────────────

function dupKey(walletAddress: string, productId: string): string {
  return `rating:dup:${walletAddress}:${productId}`;
}

/**
 * Check whether this wallet has already rated this product.
 * Returns true if a duplicate exists.
 */
export async function hasDuplicateRating(
  walletAddress: string,
  productId: string,
): Promise<boolean> {
  const key = dupKey(walletAddress, productId);
  return (await kvStore.get(key)) !== null;
}

/**
 * Record that this wallet has rated this product.
 * TTL is effectively permanent (1 year) — ratings are not time-limited.
 */
export async function recordRating(walletAddress: string, productId: string): Promise<void> {
  await kvStore.set(dupKey(walletAddress, productId), '1', 365 * 24 * 3600);
}
