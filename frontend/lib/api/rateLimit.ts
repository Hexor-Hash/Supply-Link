/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Works in serverless environments (per-instance state).
 * Supports endpoint-level configuration, short + long windows,
 * safe IP extraction from trusted proxy headers, and
 * RFC 7231-compatible Retry-After responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '@/lib/api/cors';
import { apiError, ErrorCode } from '@/lib/api/errors';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Max requests allowed in the short window */
  limit: number;
  /** Short window duration in ms */
  windowMs: number;
  /** Optional stricter long-window burst cap */
  burstLimit?: number;
  burstWindowMs?: number;
}

// ── Endpoint presets ──────────────────────────────────────────────────────────

export const RATE_LIMIT_PRESETS = {
  /** General public endpoints */
  default: { limit: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Signature-heavy or write endpoints */
  ratings: {
    limit: 20,
    windowMs: 60_000,
    burstLimit: 5,
    burstWindowMs: 10_000,
  } satisfies RateLimitConfig,
  /** File upload — expensive, strict */
  upload: {
    limit: 10,
    windowMs: 60_000,
    burstLimit: 3,
    burstWindowMs: 10_000,
  } satisfies RateLimitConfig,
  /** Fee-bump — Stellar RPC call, very strict */
  feeBump: {
    limit: 10,
    windowMs: 60_000,
    burstLimit: 2,
    burstWindowMs: 10_000,
  } satisfies RateLimitConfig,
  /** Health check */
  health: { limit: 10, windowMs: 60_000 } satisfies RateLimitConfig,
} as const;

// ── Monitoring counters ───────────────────────────────────────────────────────

const throttleCounters = new Map<string, number>();

/** Increment the throttle counter for an endpoint. */
function recordThrottle(endpoint: string): void {
  throttleCounters.set(endpoint, (throttleCounters.get(endpoint) ?? 0) + 1);
}

/** Read current throttle counts (for observability). */
export function getThrottleCounts(): Record<string, number> {
  return Object.fromEntries(throttleCounters);
}

// ── IP extraction ─────────────────────────────────────────────────────────────

/**
 * Extract the real client IP from request headers.
 * Only trusts X-Forwarded-For when TRUSTED_PROXY=true is set,
 * to prevent IP spoofing in environments without a reverse proxy.
 */
export function getClientIp(request: NextRequest): string {
  const trustProxy = process.env.TRUSTED_PROXY === 'true';

  if (trustProxy) {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const xri = request.headers.get('x-real-ip');
    if (xri) return xri.trim();
  }

  // Wallet identity as secondary key when available
  const wallet = request.headers.get('x-wallet-address');
  if (wallet) return `wallet:${wallet}`;

  return 'unknown';
}

// ── Sliding-window store ──────────────────────────────────────────────────────

const store = new Map<string, number[]>();

function check(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true, retryAfter: 0 };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Apply rate limiting to a request.
 * Returns a 429 response if the limit is exceeded, or null if the request is allowed.
 *
 * @param request  The incoming NextRequest
 * @param endpoint A stable identifier for the endpoint (used for counters and keys)
 * @param config   Rate limit configuration (use a RATE_LIMIT_PRESETS value)
 */
export function applyRateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig,
): NextResponse | null {
  const ip = getClientIp(request);
  const shortKey = `rl:${endpoint}:${ip}`;

  const shortResult = check(shortKey, config.limit, config.windowMs);
  if (!shortResult.allowed) {
    recordThrottle(endpoint);
    return withCors(
      request,
      apiError(request, 429, ErrorCode.RATE_LIMITED, 'Too many requests. Please slow down.', {
        headers: {
          'Retry-After': String(shortResult.retryAfter),
        },
      }),
    );
  }

  if (config.burstLimit !== undefined && config.burstWindowMs !== undefined) {
    const burstKey = `rl:${endpoint}:burst:${ip}`;
    const burstResult = check(burstKey, config.burstLimit, config.burstWindowMs);
    if (!burstResult.allowed) {
      recordThrottle(`${endpoint}:burst`);
      return withCors(
        request,
        apiError(
          request,
          429,
          ErrorCode.RATE_LIMITED,
          'Request burst limit exceeded. Please slow down.',
          {
            headers: { 'Retry-After': String(burstResult.retryAfter) },
          },
        ),
      );
    }
  }

  return null;
}
