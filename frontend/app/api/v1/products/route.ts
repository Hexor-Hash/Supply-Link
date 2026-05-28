/**
 * GET /api/v1/products     – list all products (paginated)
 * POST /api/v1/products    – register a new product
 *
 * Authentication: x-api-key (partner or internal)
 * Rate limiting: partner tier
 * Idempotency: POST requests via Idempotency-Key header
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCors, handleOptions } from '@/lib/api/cors';
import { apiError, withCorrelationId, ErrorCode } from '@/lib/api/errors';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rateLimit';
import { authenticateApiRequest } from '@/lib/api/auth';
import { withIdempotency } from '@/lib/api/idempotency';
import { getAllProducts, MOCK_PRODUCTS, getProductById } from '@/lib/mock/products';
import { recordRequest } from '@/lib/api/metrics';
import type { Product, PaginatedResponse } from '@/lib/types';

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

async function listProducts(req: NextRequest, apiKey: string): Promise<NextResponse> {
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 100);

  if (offset < 0 || limit < 1) {
    return apiError(req, 400, ErrorCode.VALIDATION_ERROR, 'Invalid offset or limit');
  }

  const allProducts = getAllProducts();
  const items = allProducts.slice(offset, offset + limit);

  const response: PaginatedResponse<Product> = {
    items,
    total: allProducts.length,
    offset,
    limit,
  };

  return withCors(req, withCorrelationId(req, NextResponse.json(response, { status: 200 })));
}

async function registerProduct(
  req: NextRequest,
  apiKey: string,
  rawBody: string,
): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return apiError(req, 400, ErrorCode.INVALID_PAYLOAD, 'Invalid JSON');
  }

  const body = payload as Record<string, unknown>;

  // Validate required fields
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return apiError(req, 400, ErrorCode.MISSING_FIELDS, 'Missing or invalid: name');
  }
  if (typeof body.origin !== 'string' || !body.origin.trim()) {
    return apiError(req, 400, ErrorCode.MISSING_FIELDS, 'Missing or invalid: origin');
  }
  if (typeof body.owner !== 'string' || !body.owner.trim()) {
    return apiError(req, 400, ErrorCode.MISSING_FIELDS, 'Missing or invalid: owner');
  }

  // Validate optional arrays
  const authorizedActors = Array.isArray(body.authorizedActors) ? body.authorizedActors : [];
  if (!authorizedActors.every((a) => typeof a === 'string')) {
    return apiError(req, 400, ErrorCode.VALIDATION_ERROR, 'authorizedActors must be string[]');
  }

  const requiredSignatures =
    typeof body.requiredSignatures === 'number' ? body.requiredSignatures : 1;
  if (requiredSignatures < 0) {
    return apiError(req, 400, ErrorCode.VALIDATION_ERROR, 'requiredSignatures must be >= 0');
  }

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : undefined;

  // Create new product
  const newProduct: Product = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: body.name as string,
    origin: body.origin as string,
    owner: body.owner as string,
    timestamp: Date.now(),
    active: true,
    authorizedActors,
    requiredSignatures,
    imageUrl,
    ownershipHistory: [
      {
        owner: body.owner as string,
        transferredAt: Date.now(),
      },
    ],
  };

  // TODO: Persist to database instead of mock
  MOCK_PRODUCTS.push(newProduct);

  return withCors(req, withCorrelationId(req, NextResponse.json(newProduct, { status: 201 })));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  // Apply IP-based rate limiting (public endpoint behavior)
  const limited = applyRateLimit(request, 'GET /api/v1/products', RATE_LIMIT_PRESETS.default);
  if (limited) {
    recordRequest('GET /api/v1/products', 429, Date.now() - start);
    return limited;
  }

  // Authenticate API key
  const auth = await authenticateApiRequest(request, 'partner');
  if (auth.error) {
    recordRequest('GET /api/v1/products', 401, Date.now() - start);
    return auth.error;
  }

  const response = await listProducts(request, auth.apiKey!);
  recordRequest('GET /api/v1/products', response.status, Date.now() - start);
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  // Apply IP-based rate limiting
  const limited = applyRateLimit(request, 'POST /api/v1/products', RATE_LIMIT_PRESETS.default);
  if (limited) {
    recordRequest('POST /api/v1/products', 429, Date.now() - start);
    return limited;
  }

  // Authenticate API key
  const auth = await authenticateApiRequest(request, 'partner');
  if (auth.error) {
    recordRequest('POST /api/v1/products', 401, Date.now() - start);
    return auth.error;
  }

  // Handle with idempotency
  const response = await withIdempotency(request, (req, rawBody) =>
    registerProduct(req, auth.apiKey!, rawBody),
  );

  recordRequest('POST /api/v1/products', response.status, Date.now() - start);
  return response;
}
