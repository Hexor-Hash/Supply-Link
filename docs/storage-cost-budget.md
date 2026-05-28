# Storage Rent Budgeting & Cost Profiling

This document records the storage growth model, CPU instruction budgets, and
optimization findings for the Supply-Link Soroban smart contract.

---

## Running the profiling suite

```bash
cd smart-contract

# Run all profiling tests and print raw metrics
cargo test --features testutils -- profiling --nocapture

# Generate a formatted cost report (writes smart-contract/cost_report.txt)
bash scripts/cost_report.sh

# CI mode — exits non-zero if any budget threshold is breached
FAIL_ON_BUDGET_BREACH=1 bash scripts/cost_report.sh
```

---

## Storage model

| Storage key | Type | Growth |
|---|---|---|
| `DataKey::Product(id)` | `Product` struct | O(1) per product |
| `DataKey::ProductIndex(n)` | `String` (product id) | O(1) per product |
| `DataKey::ProductCount` | `u64` | 1 entry, always |
| `DataKey::Events(id)` | `Vec<TrackingEvent>` | **O(n) per event** — see hotspot |
| `DataKey::PendingEvents(id)` | `Vec<PendingEvent>` | O(pending) per product |

### Rent cost estimate (Stellar testnet, 2026)

Soroban persistent storage costs approximately **10,000 stroops per 1 KB per
ledger** (subject to network fee schedule changes). Entries must be extended
before their TTL expires or they are archived.

| Scenario | Approx. storage size | Monthly rent estimate |
|---|---|---|
| 1,000 products, 0 events | ~200 KB | ~$0.02 |
| 1,000 products, 50 events each | ~5 MB | ~$0.50 |
| 10,000 products, 100 events each | ~100 MB | ~$10 |

*Estimates are illustrative. Use the Stellar fee calculator for production
planning.*

---

## CPU instruction budgets

Budgets are enforced as `assert!` statements in `contracts/src/profiling.rs`
and checked by `scripts/cost_report.sh`.

| Operation | Budget (CPU instructions) | Rationale |
|---|---|---|
| `register_product` | 2,500,000 | 2 writes + 1 RMW; flat O(1) |
| `add_tracking_event` | 3,000,000 | 1 read + Vec deserialise + 1 write |
| `get_tracking_events` | *(no hard limit)* | Read-only; cost tracked for trend data |
| `transfer_ownership` | *(no hard limit)* | 1 read + 1 write; low cost |
| `list_products` (page 10) | *(no hard limit)* | 10 reads; acceptable |

---

## Hotspot analysis

### 1. Unbounded `Events` Vec — HIGH IMPACT

**Path:** `add_tracking_event` → `DataKey::Events(product_id)`

All tracking events for a product are stored in a single persistent
`Vec<TrackingEvent>`. Every call to `add_tracking_event` must:

1. Deserialise the entire Vec from storage (O(n) CPU + memory)
2. Push the new event
3. Re-serialise and write the entire Vec back (O(n) bytes written)

The `get_tracking_events` read-back test shows CPU instructions grow linearly
with event count:

| Events | CPU instructions (approx.) |
|--------|---------------------------|
| 10 | ~800,000 |
| 25 | ~1,400,000 |
| 50 | ~2,600,000 |

At ~100 events per product the `add_tracking_event` call will approach the
Soroban CPU limit.

**Recommended optimization:** Replace `DataKey::Events(product_id)` with
per-event keyed storage:

```rust
// New key variant
EventEntry(String, u32),  // (product_id, index)
EventCount(String),       // per-product counter
```

Each write becomes O(1). `get_tracking_events` would require N reads but can
be paginated. This is the single highest-impact change available.

### 2. `list_products` pagination — LOW IMPACT

Each page of N products requires N individual `DataKey::ProductIndex` reads.
For the default page size of 10 this is negligible. No action required until
page sizes exceed ~100.

### 3. `register_product` — ACCEPTABLE

Two writes + one read-modify-write on `ProductCount`. Flat O(1). No action
required.

---

## Projections

| Time horizon | Products | Events/product | Total events | Estimated monthly rent |
|---|---|---|---|---|
| 3 months | 500 | 20 | 10,000 | ~$0.10 |
| 6 months | 2,000 | 50 | 100,000 | ~$1.00 |
| 12 months | 10,000 | 100 | 1,000,000 | ~$10 |

The unbounded Vec hotspot becomes operationally critical at ~12 months if the
per-event keyed storage optimization is not applied before then.

---

## CI integration

Add to your CI pipeline:

```yaml
- name: Cost profiling
  working-directory: smart-contract
  run: FAIL_ON_BUDGET_BREACH=1 bash scripts/cost_report.sh
  env:
    RUSTFLAGS: ""
```

The script exits non-zero if any `assert!` in `profiling.rs` fails, blocking
merges that regress CPU or storage budgets.

---

## Updating budgets

When a schema change or new feature legitimately increases costs:

1. Run `bash scripts/cost_report.sh` to get new baseline numbers.
2. Update the `BUDGET_*` constants in `contracts/src/profiling.rs`.
3. Update the tables in this document.
4. Commit both files together so the budget and the documentation stay in sync.
