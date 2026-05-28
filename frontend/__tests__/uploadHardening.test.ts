/**
 * Tests for upload hardening utilities.
 * Covers magic-byte verification, safe path, and quota enforcement.
 * closes #305
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyMagicBytes, safePath, checkAndIncrementQuota } from '@/lib/api/uploadHardening';

// ── Mock KV ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/kv', () => {
  const store = new Map<string, string>();
  return {
    kvStore: {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      set: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
      del: vi.fn(async (k: string) => { store.delete(k); }),
    },
    _store: store,
  };
});

// ── Magic-byte tests ──────────────────────────────────────────────────────────

describe('verifyMagicBytes', () => {
  it('accepts a valid JPEG', () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(verifyMagicBytes(buf, 'image/jpeg')).toBe(true);
  });

  it('accepts a valid PNG', () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(verifyMagicBytes(buf, 'image/png')).toBe(true);
  });

  it('accepts a valid GIF', () => {
    const buf = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(verifyMagicBytes(buf, 'image/gif')).toBe(true);
  });

  it('rejects a JPEG declared as PNG', () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(verifyMagicBytes(buf, 'image/png')).toBe(false);
  });

  it('rejects a text file declared as JPEG', () => {
    const buf = new Uint8Array([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]); // <script
    expect(verifyMagicBytes(buf, 'image/jpeg')).toBe(false);
  });

  it('rejects unknown MIME type', () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff]);
    expect(verifyMagicBytes(buf, 'application/octet-stream')).toBe(false);
  });
});

// ── Safe path tests ───────────────────────────────────────────────────────────

describe('safePath', () => {
  it('produces a path under products/<actor>/', () => {
    const p = safePath('GABC123', 'photo.jpg');
    expect(p).toMatch(/^products\/GABC123\//);
    expect(p).toMatch(/photo\.jpg$/);
  });

  it('strips path traversal sequences', () => {
    const p = safePath('actor1', '../../etc/passwd');
    expect(p).not.toContain('..');
    expect(p).not.toContain('/etc/');
  });

  it('strips null bytes', () => {
    const p = safePath('actor1', 'file\0name.jpg');
    expect(p).not.toContain('\0');
  });

  it('replaces non-ASCII characters', () => {
    const p = safePath('actor1', 'fïlé nàme.jpg');
    expect(p).toMatch(/^[a-zA-Z0-9/_.\-]+$/);
  });

  it('truncates very long filenames', () => {
    const long = 'a'.repeat(300) + '.jpg';
    const p = safePath('actor1', long);
    const filename = p.split('/').pop()!;
    // timestamp-rand-<base> where base is max 80 chars
    expect(filename.length).toBeLessThan(120);
  });
});

// ── Quota tests ───────────────────────────────────────────────────────────────

describe('checkAndIncrementQuota', () => {
  beforeEach(async () => {
    // Clear the mock store between tests
    const { _store } = await import('@/lib/kv') as any;
    _store.clear();
  });

  it('allows uploads within quota', async () => {
    const result = await checkAndIncrementQuota('actor-a', 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks uploads when quota is exhausted', async () => {
    for (let i = 0; i < 3; i++) {
      await checkAndIncrementQuota('actor-b', 3);
    }
    const result = await checkAndIncrementQuota('actor-b', 3);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks quotas independently per actor', async () => {
    await checkAndIncrementQuota('actor-c', 1);
    const blocked = await checkAndIncrementQuota('actor-c', 1);
    const allowed = await checkAndIncrementQuota('actor-d', 1);
    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });
});
