# Event Schema Versioning

This document defines the versioning policy for Supply-Link contract events so
that indexers and backend services can parse historical and future payloads
safely across contract upgrades.

---

## Policy

Every `TrackingEvent` payload carries a `schema_version: u32` field. The
current version is **1**. The version is also encoded as the **fourth topic
slot** in every emitted event, enabling consumers to filter by version without
deserialising the payload.

### Versioning rules

| Rule | Detail |
|------|--------|
| Additive changes | New optional fields → bump minor docs only, keep same version |
| Breaking changes | Field removed, renamed, or type changed → bump `EVENT_SCHEMA_VERSION` |
| Constant location | `smart-contract/contracts/src/lib.rs` → `EVENT_SCHEMA_VERSION` |

A change is **breaking** if an existing parser would misread or panic on the
new payload. When in doubt, bump the version.

---

## Event topic layout

All `TrackingEvent`-bearing events follow this topic tuple:

```
(event_name: Symbol, product_id: String, event_type: String, schema_version: u32)
```

| Slot | Type | Example |
|------|------|---------|
| 0 | `Symbol` | `event_added` |
| 1 | `String` | `batch-2024-001` |
| 2 | `String` | `SHIPPING` |
| 3 | `u32` | `1` |

Events that do **not** carry a `TrackingEvent` body (e.g. `ownership_transferred`,
`actor_authorized`) are unversioned and their topic layout is unchanged.

---

## Consumer parsing guide

Always branch on `schema_version` before reading other fields:

```typescript
function parseTrackingEvent(raw: RawEvent) {
  switch (raw.schema_version) {
    case 1:
      return parseV1(raw);
    default:
      throw new Error(`Unsupported schema version: ${raw.schema_version}`);
  }
}
```

### Filtering by version on the Stellar horizon API

```
GET /accounts/{id}/effects?type=contract_events
```

Filter the returned events where `topics[3] == <version>` to process only
events of a known schema version.

---

## Version history

| Version | Contract change | Migration notes |
|---------|----------------|-----------------|
| 1 | Initial versioned schema. `schema_version` field added to `TrackingEvent`. | No prior on-chain events exist with this field; treat any event missing `schema_version` as pre-versioning (v0) and apply a default parser that maps the old field order. |

### Handling pre-versioning (v0) events

Events emitted before this versioning scheme was introduced will not have a
`schema_version` field. Consumers should treat a missing or zero value as v0
and apply the following field mapping:

| v0 field order | v1 field name |
|----------------|---------------|
| `product_id` | `product_id` |
| `location` | `location` |
| `actor` | `actor` |
| `timestamp` | `timestamp` |
| `event_type` | `event_type` |
| `metadata` | `metadata` |
| *(absent)* | `schema_version` → default to `0` |

---

## Bumping the version (contributor checklist)

1. Increment `EVENT_SCHEMA_VERSION` in `lib.rs`.
2. Update the version history table above.
3. Update the `TrackingEvent` struct doc comment version table in `lib.rs`.
4. Add parser tests for the new version in the `tests` module.
5. Update any frontend/indexer code that reads `TrackingEvent` payloads.
