/**
 * API versioning utilities.
 *
 * - withDeprecation(): attach Deprecation + Sunset headers to a response
 * - API_VERSION: current stable version string
 *
 * closes #307
 */

import { NextResponse } from 'next/server';

export const API_VERSION = 'v1';

export interface DeprecationOptions {
  /** ISO date string for the Sunset date, e.g. "2026-08-01" */
  sunsetDate: string;
  /** URL of the successor endpoint */
  successorUrl?: string;
}

/**
 * Attach RFC 8594 Deprecation and Sunset headers to a response.
 * Use on any endpoint that is scheduled for removal.
 */
export function withDeprecation<T>(
  response: NextResponse<T>,
  opts: DeprecationOptions,
): NextResponse<T> {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', new Date(opts.sunsetDate).toUTCString());
  if (opts.successorUrl) {
    response.headers.set('Link', `<${opts.successorUrl}>; rel="successor-version"`);
  }
  return response;
}

/**
 * Attach the current API version to a response header.
 */
export function withApiVersion<T>(response: NextResponse<T>): NextResponse<T> {
  response.headers.set('X-API-Version', API_VERSION);
  return response;
}
