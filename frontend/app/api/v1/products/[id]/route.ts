/**
 * GET /api/v1/products/[id] – get product details with ownership history
 *
 * Authentication: x-api-key (partner or internal)
 * Rate limiting: partner tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCors, handleOptions } from '@/lib/api/cors';
import { apiError, withCorrelationId, ErrorCode } from '@/lib/api/errors';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rateLimit';
import { authenticateApiRequest } from '@/lib/api/auth';
import { getProductById } from '@/lib/mock/products';
import { recordRequest } from '@/lib/api/metrics';
import type { Product } from '@/lib/types';

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const start = Date.now();

  // Apply IP-based rate limiting
  const limited = applyRateLimit(request, 'GET /api/v1/products/[id]', RATE_LIMIT_PRESETS.default);
  if (limited) {
    recordRequest('GET /api/v1/products/[id]', 429, Date.now() - start);
    return limited;
  }

  // Authenticate API key
  const auth = await authenticateApiRequest(request, 'partner');
  if (auth.error) {
    recordRequest('GET /api/v1/products/[id]', 401, Date.now() - start);
    return auth.error;
  }

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    recordRequest('GET /api/v1/products/[id]', 400, Date.now() - start);
    return apiError(request, 400, ErrorCode.VALIDATION_ERROR, 'Invalid product ID');
  }

  const product = getProductById(id);
  if (!product) {
    recordRequest('GET /api/v1/products/[id]', 404, Date.now() - start);
    return withCors(
      request,
      apiError(request, 404, ErrorCode.VALIDATION_ERROR, `Product not found: ${id}`),
    );
  }

  recordRequest('GET /api/v1/products/[id]', 200, Date.now() - start);
  return withCors(request, withCorrelationId(request, NextResponse.json(product, { status: 200 })));
}
