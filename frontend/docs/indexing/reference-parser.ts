/**
 * Reference parser for on-chain contract events.
 * Normalises raw Soroban return values (which may contain BigInt timestamps)
 * into plain JS objects suitable for indexing and search.
 */

import type { Product, TrackingEvent } from '@/lib/types';

// ── Event types emitted by the contract ──────────────────────────────────────

export type EventType =
  | 'product_registered'
  | 'actor_authorized'
  | 'event_added'
  | 'event_pending'
  | 'event_finalized'
  | 'event_rejected'
  | 'ownership_transferred'
  | 'product_updated';

export interface ParsedEvent {
  /** Ledger sequence number at which the event was emitted. */
  ledger: number;
  /** Transaction hash. */
  txHash: string;
  /** Index within the transaction (for ordering within the same tx). */
  eventIndex: number;
  /** Product this event belongs to. */
  productId: string;
  /** Discriminated event type. */
  type: EventType;
  /** Typed payload — shape depends on `type`. */
  data: Product | TrackingEvent | string;
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

/** Coerce a BigInt or number timestamp to a plain JS number. */
function toNumber(v: unknown): number {
  if (typeof v === 'bigint') return Number(v);
  return Number(v ?? 0);
}

/** Normalise a raw on-chain product record. */
export function asProduct(raw: Record<string, unknown>): Product {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    origin: String(raw.origin ?? ''),
    owner: String(raw.owner ?? ''),
    timestamp: toNumber(raw.timestamp),
    active: raw.active !== false,
    authorizedActors: Array.isArray(raw.authorized_actors)
      ? (raw.authorized_actors as string[])
      : [],
    requiredSignatures: toNumber(raw.required_signatures ?? 0),
  };
}

/** Normalise a raw on-chain tracking event record. */
export function asTrackingEvent(raw: Record<string, unknown>): TrackingEvent {
  return {
    productId: String(raw.product_id ?? raw.productId ?? ''),
    location: String(raw.location ?? ''),
    actor: String(raw.actor ?? ''),
    timestamp: toNumber(raw.timestamp),
    eventType: String(raw.event_type ?? raw.eventType ?? 'HARVEST') as TrackingEvent['eventType'],
    metadata: typeof raw.metadata === 'string' ? raw.metadata : JSON.stringify(raw.metadata ?? {}),
  };
}

/** Pass-through for address strings. */
export function asAddress(raw: unknown): string {
  return String(raw ?? '');
}
