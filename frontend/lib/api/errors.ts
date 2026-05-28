/**
 * Standardized API error envelope and error code catalog.
 * All API routes must use these helpers instead of ad-hoc { error: "..." } objects.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorrelationId } from './correlation';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_JSON: 'INVALID_JSON',
  UNSUPPORTED_CONTENT_TYPE: 'UNSUPPORTED_CONTENT_TYPE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorDetail {
  field: string;
  location: 'body' | 'query' | 'params' | 'headers';
  message: string;
  code?: string;
}

export interface ApiErrorEnvelope {
  error: {
    status: number;
    code: ErrorCode;
    message: string;
    correlationId: string;
    details?: ApiErrorDetail[];
  };
}

export function apiError(
  request: NextRequest,
  status: number,
  code: ErrorCode,
  message: string,
  options?: {
    details?: ApiErrorDetail[];
    headers?: Record<string, string>;
  },
): NextResponse<ApiErrorEnvelope> {
  const correlationId = getCorrelationId(request);
  const body: ApiErrorEnvelope = {
    error: {
      status,
      code,
      message,
      correlationId,
      ...(options?.details ? { details: options.details } : {}),
    },
  };
  const res = NextResponse.json(body, { status });
  res.headers.set('X-Correlation-Id', correlationId);
  if (options?.headers) {
    for (const [k, v] of Object.entries(options.headers)) res.headers.set(k, v);
  }
  return res;
}

export function withCorrelationId(request: NextRequest, response: NextResponse): NextResponse {
  response.headers.set('X-Correlation-Id', getCorrelationId(request));
  return response;
}
