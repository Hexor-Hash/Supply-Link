/**
 * Correlation ID helpers.
 *
 * - Reads `X-Correlation-Id` or `X-Request-Id` from incoming headers.
 * - Generates a new ID when none is present.
 * - IDs are stored per-request via a WeakMap so they are consistent
 *   across multiple calls within the same request handler.
 */

import { NextRequest } from 'next/server';

const cache = new WeakMap<NextRequest, string>();

function generate(): string {
  // crypto.randomUUID is available in Node 19+ and all modern edge runtimes.
  // Fall back to a timestamp+random string for older environments.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Return the correlation ID for a request.
 * Propagates from `X-Correlation-Id` or `X-Request-Id` headers when present;
 * otherwise generates a new UUID and caches it for the lifetime of the request.
 */
export function getCorrelationId(request: NextRequest): string {
  const cached = cache.get(request);
  if (cached) return cached;

  const id =
    request.headers.get('x-correlation-id') ?? request.headers.get('x-request-id') ?? generate();

  cache.set(request, id);
  return id;
}
