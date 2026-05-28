/**
 * API key authentication and rate limiting per API key.
 *
 * Supports two access tiers:
 *   - partner: requires PARTNER_API_KEY header, rate limited per key
 *   - internal: requires INTERNAL_API_KEY header, rate limited per key
 *
 * Rate limiting uses sliding-window algorithm with per-key tracking.
 * Stores expiration data in KV for persistence across processes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiError, ErrorCode } from '@/lib/api/errors';
import { kvStore } from '@/lib/kv';

export type ApiAccessTier = 'partner' | 'internal';

export interface ApiKeyConfig {
  limit: number; // requests per window
  windowMs: number; // window duration in ms
  burstLimit?: number; // optional stricter burst cap
  burstWindowMs?: number;
}

// Default rate limits per API key
export const API_KEY_LIMITS: Record<ApiAccessTier, ApiKeyConfig> = {
  partner: {
    limit: 1000,
    windowMs: 60_000, // 1000 requests per minute
    burstLimit: 50,
    burstWindowMs: 10_000, // max 50 per 10 seconds
  },
  internal: {
    limit: 5000,
    windowMs: 60_000, // 5000 requests per minute
    burstLimit: 200,
    burstWindowMs: 10_000,
  },
};

// ── Validation ────────────────────────────────────────────────────────────────

function getPartnerKey(): string | null {
  return process.env.PARTNER_API_KEY || null;
}

function getInternalKey(): string | null {
  return process.env.INTERNAL_API_KEY || null;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

interface RateLimitRecord {
  timestamps: number[];
  expiresAt: number;
}

/**
 * Check if request is allowed based on rate limit.
 * Uses sliding-window algorithm with KV persistence.
 */
async function checkRateLimit(
  apiKey: string,
  config: ApiKeyConfig,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const kvKey = `rl:${apiKey}`;

  let record: RateLimitRecord | null = null;
  try {
    const stored = await kvStore.get(kvKey);
    if (stored) {
      record = JSON.parse(stored);
      if (record.expiresAt <= now) {
        record = null;
        await kvStore.del(kvKey);
      }
    }
  } catch {
    // KV error - allow request but log for monitoring
    console.error(`Failed to check rate limit for API key`);
  }

  if (!record) {
    record = { timestamps: [], expiresAt: now + config.windowMs };
  }

  // Filter expired timestamps
  const validTimestamps = record.timestamps.filter((t) => now - t < config.windowMs);

  // Check short window
  if (validTimestamps.length >= config.limit) {
    const oldest = validTimestamps[0];
    const retryAfter = Math.ceil((oldest + config.windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  // Check burst window if configured
  if (config.burstLimit && config.burstWindowMs) {
    const burstTimestamps = validTimestamps.filter((t) => now - t < config.burstWindowMs);
    if (burstTimestamps.length >= config.burstLimit) {
      const oldest = burstTimestamps[0];
      const retryAfter = Math.ceil((oldest + config.burstWindowMs - now) / 1000);
      return { allowed: false, retryAfter: Math.max(1, retryAfter) };
    }
  }

  // Record new timestamp
  validTimestamps.push(now);
  record.timestamps = validTimestamps;
  record.expiresAt = now + config.windowMs;

  try {
    const ttlSeconds = Math.ceil(config.windowMs / 1000) + 1;
    await kvStore.set(kvKey, JSON.stringify(record), ttlSeconds);
  } catch {
    // KV error - allow but log
    console.error(`Failed to update rate limit for API key`);
  }

  return { allowed: true };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Authenticate API request and apply rate limiting.
 * Returns error response if auth fails or rate limit exceeded, null otherwise.
 * Also returns the API key and access tier if successful.
 */
export async function authenticateApiRequest(
  request: NextRequest,
  tier: ApiAccessTier,
): Promise<{
  error: NextResponse | null;
  apiKey?: string;
}> {
  const apiKey = request.headers.get('x-api-key');

  // Check if key is provided
  if (!apiKey) {
    return {
      error: apiError(request, 401, ErrorCode.UNAUTHORIZED, 'Missing x-api-key header'),
    };
  }

  // Validate key matches configured key
  const expectedKey = tier === 'partner' ? getPartnerKey() : getInternalKey();
  if (!expectedKey) {
    return {
      error: apiError(
        request,
        401,
        ErrorCode.UNAUTHORIZED,
        'API key authentication not configured',
      ),
    };
  }

  if (apiKey !== expectedKey) {
    return {
      error: apiError(request, 401, ErrorCode.UNAUTHORIZED, 'Invalid API key'),
    };
  }

  // Apply rate limiting
  const config = API_KEY_LIMITS[tier];
  const rateLimitResult = await checkRateLimit(apiKey, config);

  if (!rateLimitResult.allowed) {
    return {
      error: apiError(request, 429, ErrorCode.RATE_LIMITED, 'API key rate limit exceeded', {
        'Retry-After': String(rateLimitResult.retryAfter),
      }),
    };
  }

  return { error: null, apiKey };
}
