/**
 * Idempotency support for mutation endpoints.
 *
 * Clients send `Idempotency-Key: <uuid>` on POST requests.
 * - Same key + same body → returns the cached response (no duplicate side effects).
 * - Same key + different body → 409 IDEMPOTENCY_CONFLICT.
 * - No key → request proceeds normally (idempotency is opt-in).
 *
 * Storage: in-memory Map with configurable TTL (default 24 h).
 * Cleanup: expired entries are pruned on each write.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '@/lib/api/cors';
import { apiError, ErrorCode } from '@/lib/api/errors';

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Store ─────────────────────────────────────────────────────────────────────

interface IdempotencyRecord {
  bodyHash: string;
  status: number;
  body: unknown;
  headers: Record<string, string>;
  expiresAt: number;
}

const store = new Map<string, IdempotencyRecord>();

/** Remove expired records. Called on every write to avoid unbounded growth. */
function prune(): void {
  const now = Date.now();
  for (const [key, record] of store) {
    if (record.expiresAt <= now) store.delete(key);
  }
}

// ── Hashing ───────────────────────────────────────────────────────────────────

/**
 * Compute a deterministic hash of the request body string.
 * Uses the Web Crypto API (available in Node 19+ and all edge runtimes).
 */
async function hashBody(body: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: simple djb2 hash for environments without Web Crypto
  let h = 5381;
  for (let i = 0; i < body.length; i++) h = ((h << 5) + h) ^ body.charCodeAt(i);
  return (h >>> 0).toString(16);
}

// ── Public API ────────────────────────────────────────────────────────────────

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

/**
 * Wrap a mutation handler with idempotency support.
 *
 * Usage:
 *   export async function POST(request: NextRequest) {
 *     return withIdempotency(request, async (req, rawBody) => {
 *       // ... handler logic using rawBody instead of req.json()
 *     });
 *   }
 *
 * The inner handler receives the raw body string so it can be parsed
 * without consuming the stream a second time.
 */
export async function withIdempotency(
  request: NextRequest,
  handler: (req: NextRequest, rawBody: string) => Promise<NextResponse>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<NextResponse> {
  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER);

  // Read body once
  const rawBody = await request.text();

  if (!idempotencyKey) {
    // No key — pass through without idempotency
    return handler(request, rawBody);
  }

  const bodyHash = await hashBody(rawBody);
  const existing = store.get(idempotencyKey);

  if (existing) {
    if (existing.expiresAt <= Date.now()) {
      // Expired — treat as new request
      store.delete(idempotencyKey);
    } else if (existing.bodyHash !== bodyHash) {
      // Same key, different payload → conflict
      return withCors(
        request,
        apiError(
          request,
          409,
          ErrorCode.IDEMPOTENCY_CONFLICT,
          'Idempotency key already used with a different request body',
        ),
      );
    } else {
      // Replay: return cached response
      const res = NextResponse.json(existing.body, { status: existing.status });
      for (const [k, v] of Object.entries(existing.headers)) res.headers.set(k, v);
      res.headers.set('Idempotent-Replayed', 'true');
      return withCors(request, res);
    }
  }

  // Execute the handler
  const response = await handler(request, rawBody);

  // Cache the result (only for non-5xx responses)
  if (response.status < 500) {
    prune();
    const responseBody = await response
      .clone()
      .json()
      .catch(() => null);
    const cachedHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      cachedHeaders[k] = v;
    });
    store.set(idempotencyKey, {
      bodyHash,
      status: response.status,
      body: responseBody,
      headers: cachedHeaders,
      expiresAt: Date.now() + ttlMs,
    });
  }

  return response;
}
