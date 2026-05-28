/**
 * Upload hardening utilities.
 *
 * - Content-signature verification (magic-byte check beyond MIME header)
 * - Safe filename sanitization
 * - Per-actor upload quota enforcement via KV
 *
 * closes #305
 */

import { kvStore } from '@/lib/kv';

// ── Magic-byte signatures ─────────────────────────────────────────────────────

const MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP — checked separately
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
};

/**
 * Verify that the first bytes of `buf` match the expected magic for `mimeType`.
 * Returns false if the declared MIME type does not match the actual content.
 */
export function verifyMagicBytes(buf: Uint8Array, mimeType: string): boolean {
  const signatures = MAGIC[mimeType];
  if (!signatures) return false;

  return signatures.some((sig) => sig.every((byte, i) => buf[i] === byte));
}

// ── Filename sanitization ─────────────────────────────────────────────────────

/**
 * Produce a safe, collision-resistant storage path.
 * Strips path traversal, null bytes, and non-ASCII characters.
 */
export function safePath(actorId: string, originalName: string): string {
  const base = originalName
    .replace(/\0/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .slice(0, 80);

  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safeActor = actorId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'anon';
  return `products/${safeActor}/${ts}-${rand}-${base}`;
}

// ── Per-actor quota ───────────────────────────────────────────────────────────

const QUOTA_WINDOW_SECONDS = 3600; // 1 hour
const DEFAULT_QUOTA = Number(process.env.UPLOAD_QUOTA_PER_HOUR ?? 20);

function quotaKey(actorId: string): string {
  const window = Math.floor(Date.now() / (QUOTA_WINDOW_SECONDS * 1000));
  return `upload:quota:${actorId}:${window}`;
}

/**
 * Check and increment the per-actor upload quota.
 * Returns `{ allowed: true }` or `{ allowed: false, remaining: 0 }`.
 */
export async function checkAndIncrementQuota(
  actorId: string,
  quota = DEFAULT_QUOTA,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = quotaKey(actorId);
  const raw = await kvStore.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= quota) {
    return { allowed: false, remaining: 0 };
  }

  await kvStore.set(key, String(count + 1), QUOTA_WINDOW_SECONDS);
  return { allowed: true, remaining: quota - count - 1 };
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export interface UploadAuditEntry {
  ts: number;
  actorId: string;
  filename: string;
  reason: string;
}

/**
 * Append a rejection audit entry to KV (best-effort, never throws).
 */
export async function logUploadRejection(entry: UploadAuditEntry): Promise<void> {
  try {
    const key = `upload:audit:rejections`;
    const raw = await kvStore.get(key);
    const log: UploadAuditEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    // Keep last 200 entries
    if (log.length > 200) log.splice(0, log.length - 200);
    await kvStore.set(key, JSON.stringify(log), 86400 * 7);
  } catch {
    // audit log failure must never block the response
  }
}
