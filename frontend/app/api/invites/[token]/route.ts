import { NextRequest, NextResponse } from "next/server";
import { kvStore } from "@/lib/kv";
import { withCors, handleOptions } from "@/lib/api/cors";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ token: string }>;
}

export function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const raw = await kvStore.get(`invite:${token}`);

  if (!raw) {
    return withCors(req, NextResponse.json({ error: "Invalid or expired token" }, { status: 404 }));
  }

  const data = JSON.parse(raw) as { productId: string; used: boolean };

  if (data.used) {
    return withCors(req, NextResponse.json({ error: "Invitation already used" }, { status: 410 }));
  }

  return withCors(req, NextResponse.json({ productId: data.productId }));
}
