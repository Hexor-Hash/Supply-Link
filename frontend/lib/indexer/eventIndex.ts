/**
 * Event index — in-process KV-backed store for off-chain analytics and search.
 *
 * The index is keyed by a composite idempotency key (ledger-txHash-eventIndex)
 * so replaying the same event is a no-op.
 *
 * Storage layout (KV):
 *   index:event:<key>          → ParsedEvent (JSON)
 *   index:product:<productId>  → string[] of event keys (append-only)
 *   index:cursor               → last indexed ledger (number)
 */

import type { ParsedEvent } from '@/docs/indexing/reference-parser';
import { kvStore } from '@/lib/kv';

const KEY_EVENT = (k: string) => `index:event:${k}`;
const KEY_PRODUCT_KEYS = (id: string) => `index:product:${id}`;
const KEY_CURSOR = 'index:cursor';

// ── In-memory fallback (dev / tests) ─────────────────────────────────────────

const memEvents = new Map<string, ParsedEvent>();
const memProductKeys = new Map<string, string[]>();
let memCursor = 0;

function useKV(): boolean {
  return !!process.env.KV_REST_API_URL;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function eventKey(e: ParsedEvent): string {
  return `${e.ledger}-${e.txHash}-${e.eventIndex}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Ingest a single event. Idempotent — duplicate keys are silently skipped. */
export async function indexEvent(event: ParsedEvent): Promise<void> {
  const key = eventKey(event);

  if (useKV()) {
    const existing = await kvStore.get(KEY_EVENT(key));
    if (existing) return; // already indexed

    await kvStore.set(KEY_EVENT(key), JSON.stringify(event), 60 * 60 * 24 * 365);

    const rawKeys = await kvStore.get(KEY_PRODUCT_KEYS(event.productId));
    const keys: string[] = rawKeys ? JSON.parse(rawKeys) : [];
    if (!keys.includes(key)) {
      keys.push(key);
      await kvStore.set(
        KEY_PRODUCT_KEYS(event.productId),
        JSON.stringify(keys),
        60 * 60 * 24 * 365,
      );
    }
  } else {
    if (memEvents.has(key)) return;
    memEvents.set(key, event);
    const keys = memProductKeys.get(event.productId) ?? [];
    keys.push(key);
    memProductKeys.set(event.productId, keys);
  }
}

/** Ingest a batch of events. */
export async function indexEvents(events: ParsedEvent[]): Promise<void> {
  for (const e of events) {
    await indexEvent(e);
  }
}

/** Get the last indexed ledger cursor. */
export async function getCursor(): Promise<number> {
  if (useKV()) {
    const raw = await kvStore.get(KEY_CURSOR);
    return raw ? Number(raw) : 0;
  }
  return memCursor;
}

/** Advance the cursor to the given ledger. */
export async function setCursor(ledger: number): Promise<void> {
  if (useKV()) {
    await kvStore.set(KEY_CURSOR, String(ledger), 60 * 60 * 24 * 365);
  } else {
    memCursor = ledger;
  }
}

/** Retrieve all indexed events for a product. */
export async function getEventsByProduct(productId: string): Promise<ParsedEvent[]> {
  if (useKV()) {
    const rawKeys = await kvStore.get(KEY_PRODUCT_KEYS(productId));
    if (!rawKeys) return [];
    const keys: string[] = JSON.parse(rawKeys);
    const events = await Promise.all(
      keys.map(async (k) => {
        const raw = await kvStore.get(KEY_EVENT(k));
        return raw ? (JSON.parse(raw) as ParsedEvent) : null;
      }),
    );
    return events.filter(Boolean) as ParsedEvent[];
  }

  const keys = memProductKeys.get(productId) ?? [];
  return keys.map((k) => memEvents.get(k)).filter(Boolean) as ParsedEvent[];
}

/** Full-text search across all indexed events. */
export interface SearchQuery {
  text?: string;
  location?: string;
  actor?: string;
  eventType?: string;
  productId?: string;
}

export async function searchEvents(query: SearchQuery): Promise<ParsedEvent[]> {
  // Collect all events
  let all: ParsedEvent[];

  if (useKV()) {
    // KV doesn't support scan; we rely on product-keyed lookup when productId is given
    if (query.productId) {
      all = await getEventsByProduct(query.productId);
    } else {
      // Without a product filter, return empty — callers should provide productId for KV
      return [];
    }
  } else {
    all = Array.from(memEvents.values());
  }

  return all.filter((e) => {
    if (query.productId && e.productId !== query.productId) return false;
    if (query.eventType && e.type !== query.eventType) return false;

    const data = e.data as Record<string, unknown>;
    if (query.actor && String(data.actor ?? '') !== query.actor) return false;
    if (query.location) {
      const loc = String(data.location ?? '').toLowerCase();
      if (!loc.includes(query.location.toLowerCase())) return false;
    }
    if (query.text) {
      const needle = query.text.toLowerCase();
      const haystack = JSON.stringify(e).toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

// Expose internals for testing
export { memEvents, memProductKeys };
export function _resetMemStore() {
  memEvents.clear();
  memProductKeys.clear();
  memCursor = 0;
}
