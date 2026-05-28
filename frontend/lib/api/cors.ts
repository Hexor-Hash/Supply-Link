import { NextRequest, NextResponse } from "next/server";

const PROD_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...(PROD_ORIGIN ? [PROD_ORIGIN] : []),
];

function getAllowOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

/** Attach CORS headers to an existing response. */
export function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const allowOrigin = getAllowOrigin(request);
  if (allowOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowOrigin);
    response.headers.set("Vary", "Origin");
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      response.headers.set(k, v);
    }
  }
  return response;
}

/** Handle OPTIONS preflight requests. */
export function handleOptions(request: NextRequest): NextResponse {
  const allowOrigin = getAllowOrigin(request);
  if (!allowOrigin) {
    return new NextResponse(null, { status: 204 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      Vary: "Origin",
      ...CORS_HEADERS,
    },
  });
}
