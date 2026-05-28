/**
 * GET /api/v1/products/[id]/events  – list tracking events for a product (paginated)
 * POST /api/v1/products/[id]/events – add a new tracking event
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
import { getProductById, getEventsByProductId, MOCK_EVENTS } from '@/lib/mock/products';
import { recordRequest } from '@/lib/api/metrics';
import type { TrackingEvent, PaginatedResponse, EventType } from '@/lib/types';

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

async function listEvents(
  req: NextRequest,
  productId: string,
  apiKey: string,
): Promise<NextResponse> {
  // Verify product exists
  const product = getProductById(productId);
  if (!product) {
    return apiError(req, 404, ErrorCode.VALIDATION_ERROR, `Product not found: ${productId}`);
  }

  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 100);

  if (offset < 0 || limit < 1) {
    return apiError(req, 400, ErrorCode.VALIDATION_ERROR, 'Invalid offset or limit');
  }

  const allEvents = getEventsByProductId(productId);
  const items = allEvents.slice(offset, offset + limit);

  const response: PaginatedResponse<TrackingEvent> = {
    items,
    total: allEvents.length,
    offset,
    limit,
  };

  return withCors(req, withCorrelationId(req, NextResponse.json(response, { status: 200 })));
}

async function addEvent(
  req: NextRequest,
  productId: string,
  apiKey: string,
  rawBody: string,
): Promise<NextResponse> {
  // Verify product exists
  const product = getProductById(productId);
  if (!product) {
    return apiError(req, 404, ErrorCode.VALIDATION_ERROR, `Product not found: ${productId}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return apiError(req, 400, ErrorCode.INVALID_PAYLOAD, 'Invalid JSON');
  }

  const body = payload as Record<string, unknown>;

  // Validate required fields
  const eventTypes: EventType[] = ['HARVEST', 'PROCESSING', 'SHIPPING', 'RETAIL'];
  if (!eventTypes.includes(body.eventType as EventType)) {
    return apiError(
      req,
      400,
      ErrorCode.VALIDATION_ERROR,
      `Invalid eventType. Allowed: ${eventTypes.join(', ')}`,
    );
  }

  if (typeof body.location !== 'string' || !body.location.trim()) {
    return apiError(req, 400, ErrorCode.MISSING_FIELDS, 'Missing or invalid: location');
  }

  if (typeof body.actor !== 'string' || !body.actor.trim()) {
    return apiError(req, 400, ErrorCode.MISSING_FIELDS, 'Missing or invalid: actor');
  }

  // Validate optional metadata
  const metadata = typeof body.metadata === 'string' ? body.metadata : '{}';
  try {
    JSON.parse(metadata);
  } catch {
    return apiError(req, 400, ErrorCode.VALIDATION_ERROR, 'metadata must be valid JSON string');
  }

  // Create new event
  const newEvent: TrackingEvent = {
    productId,
    eventType: body.eventType as EventType,
    location: body.location as string,
    actor: body.actor as string,
    timestamp: Date.now(),
    metadata,
  };

  // TODO: Persist to database instead of mock
  MOCK_EVENTS.push(newEvent);

  return withCors(req, withCorrelationId(req, NextResponse.json(newEvent, { status: 201 })));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const start = Date.now();

  // Apply IP-based rate limiting
  const limited = applyRateLimit(
    request,
    'GET /api/v1/products/[id]/events',
    RATE_LIMIT_PRESETS.default,
  );
  if (limited) {
    recordRequest('GET /api/v1/products/[id]/events', 429, Date.now() - start);
    return limited;
  }

  // Authenticate API key
  const auth = await authenticateApiRequest(request, 'partner');
  if (auth.error) {
    recordRequest('GET /api/v1/products/[id]/events', 401, Date.now() - start);
    return auth.error;
  }

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    recordRequest('GET /api/v1/products/[id]/events', 400, Date.now() - start);
    return apiError(request, 400, ErrorCode.VALIDATION_ERROR, 'Invalid product ID');
  }

  const response = await listEvents(request, id, auth.apiKey!);
  recordRequest('GET /api/v1/products/[id]/events', response.status, Date.now() - start);
  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const start = Date.now();

  // Apply IP-based rate limiting
  const limited = applyRateLimit(
    request,
    'POST /api/v1/products/[id]/events',
    RATE_LIMIT_PRESETS.default,
  );
  if (limited) {
    recordRequest('POST /api/v1/products/[id]/events', 429, Date.now() - start);
    return limited;
  }

  // Authenticate API key
  const auth = await authenticateApiRequest(request, 'partner');
  if (auth.error) {
    recordRequest('POST /api/v1/products/[id]/events', 401, Date.now() - start);
    return auth.error;
  }

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    recordRequest('POST /api/v1/products/[id]/events', 400, Date.now() - start);
    return apiError(request, 400, ErrorCode.VALIDATION_ERROR, 'Invalid product ID');
  }

  // Handle with idempotency
  const response = await withIdempotency(request, (req, rawBody) =>
    addEvent(req, id, auth.apiKey!, rawBody),
  );

  recordRequest('POST /api/v1/products/[id]/events', response.status, Date.now() - start);
  return response;
}
