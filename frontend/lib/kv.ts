/**
 * KV store abstraction.
 * - Dev / test: in-memory Map (process-scoped, resets on restart)
 * - Production: Vercel KV (Redis-backed, set via KV_REST_API_URL + KV_REST_API_TOKEN)
 */

export interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

// ── In-memory (dev) ──────────────────────────────────────────────────────────

interface MemEntry {
  value: string;
  expiresAt: number;
}

const memStore = new Map<string, MemEntry>();

const inMemoryKV: KVStore = {
  async get(key) {
    const entry = memStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memStore.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key, value, ttlSeconds) {
    memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },
  async del(key) {
    memStore.delete(key);
  },
};

// ── Vercel KV (prod) ─────────────────────────────────────────────────────────

function makeVercelKV(): KVStore {
  // Lazy import so the package is only required when env vars are present.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { kv } = require("@vercel/kv") as typeof import("@vercel/kv");
  return {
    async get(key) {
      return kv.get<string>(key);
    },
    async set(key, value, ttlSeconds) {
      await kv.set(key, value, { ex: ttlSeconds });
    },
    async del(key) {
      await kv.del(key);
    },
  };
}

// ── Export the right implementation ──────────────────────────────────────────

export const kvStore: KVStore =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? makeVercelKV()
    : inMemoryKV;
