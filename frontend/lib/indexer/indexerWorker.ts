/**
 * Indexer worker — polls the contract for new events and writes them to the
 * event index. Designed to be called from a cron job or the jobs queue.
 *
 * Recovery: tracks a ledger cursor so restarts replay only new events.
 * Duplicate handling: indexEvent() is idempotent on (ledger, txHash, eventIndex).
 */

import { indexEvents, getCursor, setCursor } from './eventIndex';
import type { ParsedEvent } from '@/docs/indexing/reference-parser';
import { asProduct, asTrackingEvent, asAddress } from '@/docs/indexing/reference-parser';

// ── Contract polling ──────────────────────────────────────────────────────────

/**
 * Fetch new contract events since `fromLedger`.
 * In production this would call the Stellar RPC `getEvents` endpoint.
 * Returns an empty array when the contract is unreachable (graceful degradation).
 */
async function fetchContractEvents(fromLedger: number): Promise<ParsedEvent[]> {
  try {
    const { RPC_URL, CONTRACT_ID } = await import('@/lib/stellar/client');

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getEvents',
      params: {
        startLedger: fromLedger,
        filters: [{ type: 'contract', contractIds: [CONTRACT_ID] }],
        pagination: { limit: 200 },
      },
    };

    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const json = await res.json();
    const rawEvents: unknown[] = json?.result?.events ?? [];

    return rawEvents.map((raw: unknown, i: number) =>
      parseRawEvent(raw as Record<string, unknown>, i),
    );
  } catch {
    return [];
  }
}

function parseRawEvent(raw: Record<string, unknown>, fallbackIndex: number): ParsedEvent {
  const topic = (raw.topic as string[] | undefined) ?? [];
  const eventType = deriveEventType(topic);
  const value = raw.value as Record<string, unknown> | string | undefined;

  let data: ParsedEvent['data'];
  if (eventType === 'product_registered' || eventType === 'product_updated') {
    data = asProduct((value as Record<string, unknown>) ?? {});
  } else if (
    eventType === 'event_added' ||
    eventType === 'event_pending' ||
    eventType === 'event_finalized' ||
    eventType === 'event_rejected'
  ) {
    data = asTrackingEvent((value as Record<string, unknown>) ?? {});
  } else {
    data = asAddress(value);
  }

  return {
    ledger: Number(raw.ledger ?? 0),
    txHash: String(raw.txHash ?? raw.id ?? ''),
    eventIndex: Number(raw.eventIndex ?? fallbackIndex),
    productId: String(raw.contractId ?? raw.contract_id ?? ''),
    type: eventType,
    data,
  };
}

function deriveEventType(topic: string[]): ParsedEvent['type'] {
  const last = topic.at(-1)?.toLowerCase() ?? '';
  if (last.includes('register')) return 'product_registered';
  if (last.includes('actor')) return 'actor_authorized';
  if (last.includes('pending')) return 'event_pending';
  if (last.includes('finalized')) return 'event_finalized';
  if (last.includes('rejected')) return 'event_rejected';
  if (last.includes('transfer')) return 'ownership_transferred';
  if (last.includes('update')) return 'product_updated';
  return 'event_added';
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface IndexerResult {
  indexed: number;
  fromLedger: number;
  toledger: number;
}

/**
 * Run one indexer tick: fetch events since the last cursor, index them,
 * and advance the cursor.
 */
export async function runIndexerTick(): Promise<IndexerResult> {
  const fromLedger = await getCursor();
  const events = await fetchContractEvents(fromLedger);

  if (events.length > 0) {
    await indexEvents(events);
    const maxLedger = Math.max(...events.map((e) => e.ledger));
    await setCursor(maxLedger + 1);
    return { indexed: events.length, fromLedger, toledger: maxLedger };
  }

  return { indexed: 0, fromLedger, toledger: fromLedger };
}
