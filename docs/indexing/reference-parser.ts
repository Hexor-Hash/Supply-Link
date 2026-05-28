/**
 * Reference event parser for Supply-Link contract events.
 *
 * Demonstrates decoding Soroban contract events from Stellar RPC responses.
 * Adapt this to your indexer's language and XDR library.
 */

import { xdr, scValToNative, Address } from "@stellar/stellar-sdk";

// ── Type definitions ──────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  origin: string;
  owner: string; // Stellar address
  timestamp: number; // Unix seconds
  authorized_actors: string[];
  required_signatures: number;
}

export interface TrackingEvent {
  product_id: string;
  location: string;
  actor: string; // Stellar address
  timestamp: number;
  event_type: string;
  metadata: string;
}

export interface PendingEvent {
  product_id: string;
  event: TrackingEvent;
  approvals: string[];
  required_signatures: number;
  created_at: number;
}

export type EventType =
  | "product_registered"
  | "event_added"
  | "event_pending"
  | "event_finalized"
  | "event_rejected"
  | "ownership_transferred"
  | "actor_authorized"
  | "product_updated";

export interface ParsedEvent {
  type: EventType;
  productId: string;
  data: Product | TrackingEvent | string; // string = Address for ownership/actor events
  ledger: number;
  txHash: string;
  eventIndex: number;
}

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parse a Soroban contract event from Stellar RPC.
 *
 * @param event - Raw event object from RPC `getEvents` response
 * @returns Parsed event or null if not a Supply-Link event
 */
export function parseContractEvent(event: any): ParsedEvent | null {
  const { type, contractId, topics, value, ledger, txHash, id } = event;

  if (type !== "contract") return null;

  // Decode topics (topics[0] is the event name Symbol)
  const topicsDecoded = topics.map((t: string) => {
    const scVal = xdr.ScVal.fromXDR(t, "base64");
    return scValToNative(scVal);
  });

  const eventType = topicsDecoded[0] as EventType;
  const productId = topicsDecoded[1] as string;

  // Decode data payload
  const dataScVal = xdr.ScVal.fromXDR(value.xdr, "base64");
  const data = scValToNative(dataScVal);

  // Extract ledger sequence and event index from the event ID
  // Event ID format: "0000012345-0000000001" (ledger-eventIndex)
  const [ledgerStr, eventIndexStr] = id.split("-");
  const ledgerSeq = parseInt(ledgerStr, 10);
  const eventIdx = parseInt(eventIndexStr, 10);

  return {
    type: eventType,
    productId,
    data,
    ledger: ledgerSeq,
    txHash,
    eventIndex: eventIdx,
  };
}

/**
 * Type-safe accessor for Product payloads.
 */
export function asProduct(data: any): Product {
  return {
    id: data.id,
    name: data.name,
    origin: data.origin,
    owner: data.owner,
    timestamp: Number(data.timestamp),
    authorized_actors: data.authorized_actors || [],
    required_signatures: Number(data.required_signatures || 0),
  };
}

/**
 * Type-safe accessor for TrackingEvent payloads.
 */
export function asTrackingEvent(data: any): TrackingEvent {
  return {
    product_id: data.product_id,
    location: data.location,
    actor: data.actor,
    timestamp: Number(data.timestamp),
    event_type: data.event_type,
    metadata: data.metadata,
  };
}

/**
 * Type-safe accessor for Address payloads (ownership_transferred, actor_authorized).
 */
export function asAddress(data: any): string {
  return data; // scValToNative already converts Address to string
}

// ── Example usage ─────────────────────────────────────────────────────────────

/**
 * Example indexer loop.
 */
export async function indexLedgerRange(
  rpcUrl: string,
  contractId: string,
  startLedger: number,
  endLedger: number
): Promise<ParsedEvent[]> {
  const events: ParsedEvent[] = [];

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getEvents",
      params: {
        startLedger,
        filters: [{ type: "contract", contractIds: [contractId], topics: [["*"]] }],
        pagination: { limit: 1000 },
      },
    }),
  });

  const { result } = await response.json();

  for (const rawEvent of result.events || []) {
    const parsed = parseContractEvent(rawEvent);
    if (parsed && parsed.ledger <= endLedger) {
      events.push(parsed);
    }
  }

  return events;
}
