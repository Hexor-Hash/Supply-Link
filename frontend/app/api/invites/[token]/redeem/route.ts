import { NextRequest, NextResponse } from 'next/server';
import { kvStore } from '@/lib/kv';
import { withCors, handleOptions } from '@/lib/api/cors';
import type { InviteRecord } from '../../route';

export const runtime = 'nodejs';

const TTL_USED_MARKER = 60 * 60 * 24; // keep used marker 24 h

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
    return withCors(req, NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 }));
  }

  const data = JSON.parse(raw) as InviteRecord;

  if (data.revoked) {
    return withCors(
      req,
      NextResponse.json({ error: 'Invitation has been revoked' }, { status: 410 }),
    );
  }

  if (data.used) {
    return withCors(req, NextResponse.json({ error: 'Invitation already used' }, { status: 410 }));
  }

  // Bind wallet address on redemption
  const body = await req.json().catch(() => ({}));
  const walletAddress: string | undefined = body?.walletAddress;

  const updated: InviteRecord = {
    ...data,
    used: true,
    redeemedBy: walletAddress,
  };
  await kvStore.set(key, JSON.stringify(updated), TTL_USED_MARKER);

  return withCors(
    req,
    NextResponse.json({ productId: data.productId, role: data.role, redeemedBy: walletAddress }),
  );
}
