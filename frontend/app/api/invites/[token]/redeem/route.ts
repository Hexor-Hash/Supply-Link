import { NextRequest, NextResponse } from "next/server";
import { kvStore } from "@/lib/kv";
import { withCors, handleOptions } from "@/lib/api/cors";

export const runtime = "nodejs";

const TTL_REMAINING = 60 * 60 * 24; // keep the used marker for 24 h so re-use returns 410

interface Params {
  params: Promise<{ token: string }>;
}

export function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const key = `invite:${token}`;
  const raw = await kvStore.get(key);

  if (!raw) {
    return withCors(req, NextResponse.json({ error: "Invalid or expired token" }, { status: 404 }));
  }

  const data = JSON.parse(raw) as { productId: string; used: boolean };

  if (data.used) {
    return withCors(req, NextResponse.json({ error: "Invitation already used" }, { status: 410 }));
  }

  // Mark as used (keep entry so re-use returns 410 instead of 404)
  await kvStore.set(key, JSON.stringify({ ...data, used: true }), TTL_REMAINING);

  return withCors(req, NextResponse.json({ productId: data.productId }));
}
