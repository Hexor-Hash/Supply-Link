/**
 * GET /api/v1/events/search
 *
 * Query params:
 *   productId  – filter by product (required when using KV backend)
 *   text       – full-text search across all fields
 *   location   – substring match on location
 *   actor      – exact match on actor address
 *   eventType  – exact match on event type
 */
import { NextRequest, NextResponse } from 'next/server';
import { searchEvents } from '@/lib/indexer/eventIndex';
import { withCors, handleOptions } from '@/lib/api/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const results = await searchEvents({
    productId: searchParams.get('productId') ?? undefined,
    text: searchParams.get('text') ?? undefined,
    location: searchParams.get('location') ?? undefined,
    actor: searchParams.get('actor') ?? undefined,
    eventType: searchParams.get('eventType') ?? undefined,
  });

  return withCors(req, NextResponse.json({ results, total: results.length }));
}
