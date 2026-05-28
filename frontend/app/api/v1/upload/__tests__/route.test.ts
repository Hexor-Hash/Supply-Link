import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const put = vi.fn();
const enqueue = vi.fn();
const verifyMagicBytes = vi.fn();
const safePath = vi.fn();
const checkAndIncrementQuota = vi.fn();
const logUploadRejection = vi.fn();

vi.mock('@vercel/blob', () => ({
  put,
}));

vi.mock('@/lib/api/cors', () => ({
  withCors: (_req: NextRequest, res: NextResponse) => res,
  handleOptions: () => new NextResponse(null, { status: 204 }),
}));

vi.mock('@/lib/api/rateLimit', () => ({
  applyRateLimit: vi.fn(() => null),
  RATE_LIMIT_PRESETS: {
    upload: {},
  },
  getClientIp: vi.fn(() => 'test-actor'),
}));

vi.mock('@/lib/api/uploadHardening', () => ({
  verifyMagicBytes,
  safePath,
  checkAndIncrementQuota,
  logUploadRejection,
}));

vi.mock('@/lib/jobs/queue', () => ({
  enqueue,
}));

describe('upload route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyMagicBytes.mockReturnValue(true);
    safePath.mockReturnValue('products/test-actor/file.png');
    checkAndIncrementQuota.mockResolvedValue({ allowed: true, remaining: 9 });
    put.mockResolvedValue({ url: 'https://blob.example/file.png' });
    enqueue.mockResolvedValueOnce({ id: 'scan-1' }).mockResolvedValueOnce({ id: 'process-1' });
    logUploadRejection.mockResolvedValue(undefined);
  });

  it('rejects unsupported content types before upload work starts', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/v1/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ file: 'nope' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error.code).toBe('UNSUPPORTED_CONTENT_TYPE');
    expect(put).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects missing file entries before upload work starts', async () => {
    const { POST } = await import('../route');
    const formData = new FormData();
    formData.set('productId', 'prod-1');
    const request = makeMultipartRequest(formData);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(put).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('accepts a valid multipart upload', async () => {
    const { POST } = await import('../route');
    const formData = new FormData();
    formData.set('productId', 'prod-1');
    formData.set(
      'file',
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'proof.png', {
        type: 'image/png',
      }),
    );
    const request = makeMultipartRequest(formData);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.url).toBe('https://blob.example/file.png');
    expect(put).toHaveBeenCalledOnce();
    expect(enqueue).toHaveBeenCalledTimes(2);
  });
});

function makeMultipartRequest(formData: FormData): NextRequest {
  return {
    method: 'POST',
    headers: new Headers({ 'content-type': 'multipart/form-data; boundary=test-boundary' }),
    nextUrl: new URL('http://localhost/api/v1/upload'),
    formData: vi.fn(async () => formData),
  } as unknown as NextRequest;
}
