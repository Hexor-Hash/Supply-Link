# Supply-Link Contract Indexing Guide

> For off-chain consumers indexing the Supply-Link Soroban contract on Stellar.

---

## Overview

The Supply-Link contract emits **8 contract events** across its lifecycle.
All events follow the Soroban event model:

```
topics: [Symbol, ...discriminators]   // used for filtering
data:   <XDR-encoded payload>         // the event body
```

Events are emitted within a transaction and share its ledger sequence number.
They are **append-only** and **immutable** once the ledger is closed.

---

## Event Reference

### 1. `product_registered`

Emitted by: `register_product`

| Field | Value |
|---|---|
| `topics[0]` | `"product_registered"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `data` | `Product` struct |

**`Product` payload fields:**

| Field | Type | Notes |
|---|---|---|
| `id` | String | Unique product identifier |
| `name` | String | Human-readable name |
| `origin` | String | Geographic/org origin |
| `owner` | Address | Current owner (Stellar address) |
| `timestamp` | u64 | Ledger timestamp (Unix seconds) |
| `authorized_actors` | Vec\<Address\> | Initially empty |
| `required_signatures` | u32 | 0 or 1 = immediate; >1 = multi-sig |

---

### 2. `event_added`

Emitted by: `add_tracking_event` when `required_signatures ≤ 1`

| Field | Value |
|---|---|
| `topics[0]` | `"event_added"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `topics[2]` | `event_type` (String) |
| `data` | `TrackingEvent` struct |

**`TrackingEvent` payload fields:**

| Field | Type | Notes |
|---|---|---|
| `product_id` | String | Parent product ID |
| `location` | String | Free-form location |
| `actor` | Address | Submitting address |
| `timestamp` | u64 | Ledger timestamp (Unix seconds) |
| `event_type` | String | `HARVEST` \| `PROCESSING` \| `SHIPPING` \| `RETAIL` |
| `metadata` | String | Opaque JSON string |

---

### 3. `event_pending`

Emitted by: `add_tracking_event` when `required_signatures > 1`

| Field | Value |
|---|---|
| `topics[0]` | `"event_pending"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `topics[2]` | `event_type` (String) |
| `data` | `TrackingEvent` struct (same schema as `event_added`) |

> The event is **not yet finalized**. Do not add it to the confirmed event log
> until `event_finalized` is received for the same product and event type.

---

### 4. `event_finalized`

Emitted by: `approve_event` when approval threshold is reached

| Field | Value |
|---|---|
| `topics[0]` | `"event_finalized"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `topics[2]` | `event_type` (String) |
| `data` | `TrackingEvent` struct |

> Indexers should match this against a previously seen `event_pending` and
> promote it to the confirmed event log.

---

### 5. `event_rejected`

Emitted by: `reject_event`

| Field | Value |
|---|---|
| `topics[0]` | `"event_rejected"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `data` | `TrackingEvent` struct (the rejected event body) |

> Remove the corresponding `event_pending` entry from the pending queue.

---

### 6. `ownership_transferred`

Emitted by: `transfer_ownership`

| Field | Value |
|---|---|
| `topics[0]` | `"ownership_transferred"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `data` | `Address` (new owner) |

---

### 7. `actor_authorized`

Emitted by: `add_authorized_actor`

| Field | Value |
|---|---|
| `topics[0]` | `"actor_authorized"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `data` | `Address` (newly authorized actor) |

---

### 8. `product_updated`

Emitted by: `update_product_metadata`

| Field | Value |
|---|---|
| `topics[0]` | `"product_updated"` (Symbol) |
| `topics[1]` | product `id` (String) |
| `data` | `Product` struct (full updated product) |

> `remove_authorized_actor` does **not** emit an event. Indexers must poll
> `get_authorized_actors` or diff against the `Product` struct in
> `product_updated` to detect removals.

---

## Ordering and Idempotency

### Ordering guarantees

- Events within a single transaction are ordered by emission sequence.
- Across transactions, order by `(ledger_sequence, transaction_index, event_index)`.
- `get_tracking_events` returns events in **insertion order** (oldest first),
  which matches ledger order for single-signature products.
- For multi-sig products, the finalized order is determined by when
  `event_finalized` is emitted, not when `event_pending` was emitted.

### Idempotency

- Use `(contract_id, ledger_sequence, transaction_hash, event_index)` as the
  **primary deduplication key** for each raw event.
- `product_id` is caller-supplied and unique per contract instance but not
  globally unique across contract deployments.
- Re-processing the same ledger range must produce the same indexed state.
  All event handlers must be idempotent (upsert, not insert).

### Reorg handling

Stellar uses **deterministic finality** — a closed ledger is never reverted.
There are no chain reorganizations. Indexers do not need reorg rollback logic.

However, **RPC node gaps** (missed ledgers due to connectivity) can occur.
Recommended strategy:

1. Track the last successfully indexed `ledger_sequence`.
2. On reconnect, re-fetch from `last_indexed_ledger + 1`.
3. Apply idempotent upserts — duplicate processing is safe.

---

## Compatibility Notes for Future Schema Evolution

| Change type | Safe? | Guidance |
|---|---|---|
| Add optional field to `Product` or `TrackingEvent` | ✅ Yes | Decode with defaults for missing fields |
| Add a new event topic | ✅ Yes | Ignore unknown `topics[0]` values |
| Rename an existing event topic | ❌ Breaking | Requires versioned event name (e.g. `event_added_v2`) |
| Remove a field from `Product` or `TrackingEvent` | ❌ Breaking | Requires schema version bump |
| Change field type | ❌ Breaking | Requires schema version bump |
| Add a new contract function with new events | ✅ Yes | New topic; existing indexers unaffected |

**Versioning convention (future):** breaking schema changes will introduce a
`_v2` suffix on the event topic symbol (e.g. `product_registered_v2`).
Indexers should subscribe to both old and new topic names during migration
windows.

---

## Reference: Stellar Horizon / RPC Filtering

Subscribe to contract events using the Stellar RPC `getEvents` method:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getEvents",
  "params": {
    "startLedger": 1000000,
    "filters": [
      {
        "type": "contract",
        "contractIds": ["<CONTRACT_ID>"],
        "topics": [["*"]]
      }
    ],
    "pagination": { "limit": 200 }
  }
}
```

Filter by specific event type:

```json
"topics": [["AAAADwAAAA9wcm9kdWN0X3JlZ2lzdGVyZWQ="]]
```

(The value is the base64-encoded XDR Symbol for `"product_registered"`.)
