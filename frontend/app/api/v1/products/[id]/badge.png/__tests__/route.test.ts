import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const getProduct = vi.fn();

vi.mock('@/lib/api/cors', () => ({
  withCors: (_req: NextRequest, res: NextResponse) => res,
  handleOptions: () => new NextResponse(null, { status: 204 }),
}));

vi.mock('@/lib/services/productReadModel', () => ({
  getProduct,
}));

describe('badge route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProduct.mockResolvedValue({
      name: 'Coffee Lot',
      origin: 'Lagos',
      timestamp: Date.now(),
    });
  });

  it('rejects invalid path params before reading the product', async () => {
    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost/api/v1/products/%20/badge.png');

    const response = await GET(request, { params: Promise.resolve({ id: ' ' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(getProduct).not.toHaveBeenCalled();
  });

  it('accepts a valid path param', async () => {
    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost/api/v1/products/prod-1/badge.png');

    const response = await GET(request, { params: Promise.resolve({ id: 'prod-1' }) });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('Coffee Lot');
    expect(getProduct).toHaveBeenCalledWith('prod-1');
  });
});
