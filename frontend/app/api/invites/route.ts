import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { kvStore } from "@/lib/kv";
import { withCors, handleOptions } from "@/lib/api/cors";

export const runtime = "nodejs";

const TTL = 60 * 60 * 24; // 24 hours

export function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId: string | undefined = body?.productId;

  if (!productId || typeof productId !== "string") {
    return withCors(req, NextResponse.json({ error: "productId required" }, { status: 400 }));
  }

  const token = randomBytes(24).toString("hex");
  await kvStore.set(`invite:${token}`, JSON.stringify({ productId, used: false }), TTL);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const inviteUrl = `${base}/invite/${token}`;

  return withCors(req, NextResponse.json({ token, inviteUrl, expiresIn: TTL }, { status: 201 }));
}
