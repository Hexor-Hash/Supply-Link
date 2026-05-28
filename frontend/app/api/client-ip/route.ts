/**
 * GET /api/client-ip
 *
 * Returns the client's IP address for anonymized scan tracking.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get IP from headers (set by Vercel or reverse proxy)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    return NextResponse.json({ ip });
  } catch (error) {
    return NextResponse.json({ ip: '127.0.0.1' });
  }
}
