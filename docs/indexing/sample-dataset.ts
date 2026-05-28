/**
 * Sample indexed dataset for Supply-Link contract events.
 *
 * These fixtures represent the canonical decoded form of each event type.
 * Used by verification tests to validate parser correctness.
 */

import type { ParsedEvent, Product, TrackingEvent } from "./reference-parser";

export const SAMPLE_PRODUCT: Product = {
  id: "batch-2024-001",
  name: "Arabica Coffee Beans",
  origin: "Yirgacheffe, Ethiopia",
  owner: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
  timestamp: 1714262400,
  authorized_actors: [
    "GBVNNPOFVV2YNXSQXDJPBVQYY6MZXHKQKZQZQZQZQZQZQZQZQZQZQZQ",
  ],
  required_signatures: 1,
};

export const SAMPLE_TRACKING_EVENT: TrackingEvent = {
  product_id: "batch-2024-001",
  location: "Port of Rotterdam, Netherlands",
  actor: "GBVNNPOFVV2YNXSQXDJPBVQYY6MZXHKQKZQZQZQZQZQZQZQZQZQZQZQ",
  timestamp: 1714348800,
  event_type: "SHIPPING",
  metadata: '{"container":"MSCU1234567","temperature":"4°C","humidity":"60%"}',
};

// Canonical parsed events for each event type
export const SAMPLE_EVENTS: ParsedEvent[] = [
  {
    type: "product_registered",
    productId: "batch-2024-001",
    data: SAMPLE_PRODUCT,
    ledger: 1000001,
    txHash: "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222",
    eventIndex: 0,
  },
  {
    type: "actor_authorized",
    productId: "batch-2024-001",
    data: "GBVNNPOFVV2YNXSQXDJPBVQYY6MZXHKQKZQZQZQZQZQZQZQZQZQZQZQ",
    ledger: 1000002,
    txHash: "bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333",
    eventIndex: 0,
  },
  {
    type: "event_added",
    productId: "batch-2024-001",
    data: SAMPLE_TRACKING_EVENT,
    ledger: 1000010,
    txHash: "cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444",
    eventIndex: 0,
  },
  {
    type: "event_pending",
    productId: "batch-2024-001",
    data: { ...SAMPLE_TRACKING_EVENT, event_type: "RETAIL" },
    ledger: 1000020,
    txHash: "dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444eeee5555",
    eventIndex: 0,
  },
  {
    type: "event_finalized",
    productId: "batch-2024-001",
    data: { ...SAMPLE_TRACKING_EVENT, event_type: "RETAIL" },
    ledger: 1000021,
    txHash: "eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666",
    eventIndex: 0,
  },
  {
    type: "event_rejected",
    productId: "batch-2024-001",
    data: { ...SAMPLE_TRACKING_EVENT, event_type: "PROCESSING" },
    ledger: 1000030,
    txHash: "ffff6666aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111",
    eventIndex: 0,
  },
  {
    type: "ownership_transferred",
    productId: "batch-2024-001",
    data: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQE3CQNQ3YBQM2XLNIY7",
    ledger: 1000040,
    txHash: "1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff1111aaaa2222bbbb",
    eventIndex: 0,
  },
  {
    type: "product_updated",
    productId: "batch-2024-001",
    data: { ...SAMPLE_PRODUCT, name: "Arabica Coffee Beans (Grade A)", origin: "Sidama, Ethiopia" },
    ledger: 1000050,
    txHash: "2222bbbb3333cccc4444dddd5555eeee6666ffff1111aaaa2222bbbb3333cccc",
    eventIndex: 0,
  },
];
