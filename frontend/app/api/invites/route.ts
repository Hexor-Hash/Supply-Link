/**
 * POST /api/invites
 * Create a new invite token for a product.
 *
 * Body: { productId, role?, expiresInSeconds? }
 * Returns: { token, inviteUrl, expiresIn, role }
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { kvStore } from '@/lib/kv';
import { withCors, handleOptions } from '@/lib/api/cors';

export const runtime = 'nodejs';

const DEFAULT_TTL = 60 * 60 * 24; // 24 hours
const MAX_TTL = 60 * 60 * 24 * 7; // 7 days

export type InviteRole = 'actor' | 'viewer';

export interface InviteRecord {
  productId: string;
  role: InviteRole;
  used: boolean;
  createdAt: number;
  expiresAt: number;
  /** Wallet address bound on redemption */
  redeemedBy?: string;
  revoked?: boolean;
}

export function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId: string | undefined = body?.productId;
  const role: InviteRole = body?.role === 'viewer' ? 'viewer' : 'actor';
  const ttl = Math.min(Number(body?.expiresInSeconds) || DEFAULT_TTL, MAX_TTL);

  if (!productId || typeof productId !== 'string') {
    return withCors(req, NextResponse.json({ error: 'productId required' }, { status: 400 }));
  }

  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  const record: InviteRecord = {
    productId,
    role,
    used: false,
    createdAt: now,
    expiresAt: now + ttl * 1000,
  };

  await kvStore.set(`invite:${token}`, JSON.stringify(record), ttl);

  // Track token under product for management listing
  const listKey = `invite:list:${productId}`;
  const rawList = await kvStore.get(listKey);
  const list: string[] = rawList ? JSON.parse(rawList) : [];
  list.push(token);
  await kvStore.set(listKey, JSON.stringify(list), MAX_TTL);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`;
  const inviteUrl = `${base}/invite/${token}`;

  return withCors(
    req,
    NextResponse.json({ token, inviteUrl, expiresIn: ttl, role }, { status: 201 }),
  );
}

/**
 * GET /api/invites?productId=<id>
 * List all invite tokens for a product (for owner management UI).
 */
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId');
  if (!productId) {
    return withCors(req, NextResponse.json({ error: 'productId required' }, { status: 400 }));
  }

  const listKey = `invite:list:${productId}`;
  const rawList = await kvStore.get(listKey);
  const tokens: string[] = rawList ? JSON.parse(rawList) : [];

  const invites = await Promise.all(
    tokens.map(async (token) => {
      const raw = await kvStore.get(`invite:${token}`);
      if (!raw) return null;
      const record = JSON.parse(raw) as InviteRecord;
      return { token, ...record };
    }),
  );

  return withCors(req, NextResponse.json({ invites: invites.filter(Boolean) }));
}
