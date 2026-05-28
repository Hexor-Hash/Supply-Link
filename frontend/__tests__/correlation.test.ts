import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { getCorrelationId } from '@/lib/api/correlation';
import { apiError, ErrorCode } from '@/lib/api/errors';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', { headers });
}

describe('getCorrelationId', () => {
  it('generates a new ID when no header is present', () => {
    const req = makeRequest();
    const id = getCorrelationId(req);
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('returns the same ID on repeated calls for the same request', () => {
    const req = makeRequest();
    expect(getCorrelationId(req)).toBe(getCorrelationId(req));
  });

  it('propagates X-Correlation-Id from incoming header', () => {
    const req = makeRequest({ 'x-correlation-id': 'my-trace-123' });
    expect(getCorrelationId(req)).toBe('my-trace-123');
  });

  it('propagates X-Request-Id as fallback', () => {
    const req = makeRequest({ 'x-request-id': 'req-abc' });
    expect(getCorrelationId(req)).toBe('req-abc');
  });

  it('prefers X-Correlation-Id over X-Request-Id', () => {
    const req = makeRequest({ 'x-correlation-id': 'corr-1', 'x-request-id': 'req-2' });
    expect(getCorrelationId(req)).toBe('corr-1');
  });

  it('generates different IDs for different requests', () => {
    const id1 = getCorrelationId(makeRequest());
    const id2 = getCorrelationId(makeRequest());
    expect(id1).not.toBe(id2);
  });
});

describe('apiError', () => {
  it('includes correlationId in the error body', async () => {
    const req = makeRequest({ 'x-correlation-id': 'trace-xyz' });
    const res = apiError(req, 400, ErrorCode.VALIDATION_ERROR, 'bad input');
    const body = await res.json();
    expect(body.error.status).toBe(400);
    expect(body.error.correlationId).toBe('trace-xyz');
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('bad input');
    expect(res.status).toBe(400);
  });

  it('sets X-Correlation-Id response header', () => {
    const req = makeRequest({ 'x-correlation-id': 'hdr-test' });
    const res = apiError(req, 500, ErrorCode.INTERNAL_ERROR, 'oops');
    expect(res.headers.get('x-correlation-id')).toBe('hdr-test');
  });

  it('does not leak stack traces in the response body', async () => {
    const req = makeRequest();
    const res = apiError(req, 500, ErrorCode.INTERNAL_ERROR, 'something went wrong');
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('at ');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('passes extra headers through', () => {
    const req = makeRequest();
    const res = apiError(req, 429, ErrorCode.RATE_LIMITED, 'slow down', {
      headers: { 'Retry-After': '60' },
    });
    expect(res.headers.get('retry-after')).toBe('60');
  });
});
