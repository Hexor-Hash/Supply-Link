import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withIdempotency, IDEMPOTENCY_KEY_HEADER } from '@/lib/api/idempotency';

function makeRequest(body: string, idempotencyKey?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (idempotencyKey) headers[IDEMPOTENCY_KEY_HEADER] = idempotencyKey;
  return new NextRequest('http://localhost/api/test', {
    method: 'POST',
    headers,
    body,
  });
}

/** A simple handler that echoes the body back with status 201 */
async function echoHandler(_req: NextRequest, rawBody: string): Promise<NextResponse> {
  return NextResponse.json(JSON.parse(rawBody), { status: 201 });
}

describe('withIdempotency', () => {
  it('passes through when no idempotency key is provided', async () => {
    const req = makeRequest(JSON.stringify({ foo: 'bar' }));
    const res = await withIdempotency(req, echoHandler);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.foo).toBe('bar');
  });

  it('returns the same response on replay with identical key and body', async () => {
    const key = `idem-replay-${Math.random()}`;
    const body = JSON.stringify({ action: 'test' });

    const res1 = await withIdempotency(makeRequest(body, key), echoHandler);
    expect(res1.status).toBe(201);

    const res2 = await withIdempotency(makeRequest(body, key), echoHandler);
    expect(res2.status).toBe(201);
    expect(res2.headers.get('idempotent-replayed')).toBe('true');
  });

  it('returns 409 when same key is used with a different body', async () => {
    const key = `idem-conflict-${Math.random()}`;

    await withIdempotency(makeRequest(JSON.stringify({ v: 1 }), key), echoHandler);
    const res = await withIdempotency(makeRequest(JSON.stringify({ v: 2 }), key), echoHandler);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('does not cache 5xx responses', async () => {
    const key = `idem-5xx-${Math.random()}`;
    const body = JSON.stringify({ x: 1 });

    let callCount = 0;
    const failingHandler = async (_req: NextRequest, _raw: string): Promise<NextResponse> => {
      callCount++;
      return NextResponse.json({ error: 'boom' }, { status: 500 });
    };

    await withIdempotency(makeRequest(body, key), failingHandler);
    await withIdempotency(makeRequest(body, key), failingHandler);

    // Handler should have been called twice (not cached)
    expect(callCount).toBe(2);
  });

  it('treats expired records as new requests', async () => {
    const key = `idem-expire-${Math.random()}`;
    const body = JSON.stringify({ x: 1 });

    // Use a 1ms TTL so it expires immediately
    await withIdempotency(makeRequest(body, key), echoHandler, 1);
    await new Promise((r) => setTimeout(r, 5));

    let callCount = 0;
    const countingHandler = async (_req: NextRequest, raw: string): Promise<NextResponse> => {
      callCount++;
      return NextResponse.json(JSON.parse(raw), { status: 201 });
    };

    await withIdempotency(makeRequest(body, key), countingHandler, 1);
    expect(callCount).toBe(1); // handler was called again after expiry
  });

  it('replay response does not include Idempotent-Replayed on first call', async () => {
    const key = `idem-first-${Math.random()}`;
    const res = await withIdempotency(makeRequest(JSON.stringify({ a: 1 }), key), echoHandler);
    expect(res.headers.get('idempotent-replayed')).toBeNull();
  });
});
