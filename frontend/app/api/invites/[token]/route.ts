import { NextRequest, NextResponse } from 'next/server';
import { kvStore } from '@/lib/kv';
import { withCors, handleOptions } from '@/lib/api/cors';
import type { InviteRecord } from '../route';

export const runtime = 'nodejs';

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

  return withCors(
    req,
    NextResponse.json({ productId: data.productId, role: data.role, expiresAt: data.expiresAt }),
  );
}

/**
 * DELETE /api/invites/[token]
 * Revoke an invite token (owner action).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const key = `invite:${token}`;
  const raw = await kvStore.get(key);

  if (!raw) {
    return withCors(req, NextResponse.json({ error: 'Token not found' }, { status: 404 }));
  }

  const data = JSON.parse(raw) as InviteRecord;
  const updated: InviteRecord = { ...data, revoked: true };
  // Keep for 24 h so revoked status is visible
  await kvStore.set(key, JSON.stringify(updated), 60 * 60 * 24);

  return withCors(req, NextResponse.json({ revoked: true }));
}
