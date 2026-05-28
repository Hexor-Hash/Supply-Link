# Smart Contract Stable Pending Event ID Design Document

## Problem Statement

Pending event approval in the Supply-Link contract relies on **index-based references** (`event_index: u32`) passed by clients to target events in the approval queue. This creates a critical vulnerability:

**Index Shift Race Condition:**

```
Initial state:
[PendingEvent(id=1), PendingEvent(id=2), PendingEvent(id=3)]
 Index:        0             1              2

Client A observes: "I want to approve event at index 1"
→ Claims will target PendingEvent(id=2)

Between observation and approval:
Owner rejects index 0 → queue shifts
[PendingEvent(id=2), PendingEvent(id=3)]
 Index:        0             1

Client A submits approval for index 1
→ Now accidentally approves PendingEvent(id=3) instead of PendingEvent(id=2)
```

This violates the determinism requirement: **the same approval operation can act on different events depending on timing**.

## Solution Architecture

### 1. Stable Identifier Strategy

Each pending event receives an **immutable unique identifier** at creation time:

```rust
pub struct PendingEvent {
    pub pending_event_id: u64,    // NEW: Stable identifier
    pub product_id: String,
    pub event: TrackingEvent,
    pub approvals: Vec<Address>,
    pub required_signatures: u32,
    pub created_at: u64,
}
```

**Properties:**

- **Per-product counter**: `NextPendingId(product_id)` → u64
- **Monotonically increasing**: 0, 1, 2, ... (never reset, no reuse)
- **Immutable**: Never changes after creation
- **Deterministic**: Generation at event creation is deterministic

### 2. Updated Function Signatures

**Before:**

```rust
pub fn approve_event(
    env: Env,
    product_id: String,
    event_index: u32,        // ❌ Index-based (vulnerable)
    approver: Address,
) -> Result<bool, Error>
```

**After:**

```rust
pub fn approve_event(
    env: Env,
    product_id: String,
    pending_event_id: u64,   // ✅ Stable identifier
    approver: Address,
    nonce: u64,              // Added nonce support
) -> Result<bool, Error>
```

Same for `reject_event`:

```rust
pub fn reject_event(
    env: Env,
    product_id: String,
    pending_event_id: u64,   // ✅ Stable identifier
    rejector: Address,
    reason: String,
    nonce: u64,              // Added nonce support
) -> bool
```

### 3. Implementation Details

#### Event Lookup (Stable ID → Vector Index)

```rust
// Linear search by pending_event_id (not index)
let mut event_position: Option<usize> = None;
for i in 0..pending.len() {
    if pending.get(i).unwrap().pending_event_id == pending_event_id {
        event_position = Some(i);
        break;
    }
}

let event_index = event_position.ok_or_else(|| {
    panic!("pending event not found")
})?;
```

#### ID Counter Management

```rust
// Increment for next event
let next_id: u64 = env
    .storage()
    .persistent()
    .get(&DataKey::NextPendingId(product_id))
    .unwrap_or(0u64);

// Store new event with stable ID
let pending_event = PendingEvent {
    pending_event_id: next_id,  // Current ID
    // ... other fields
};

// Increment counter for future events
env.storage()
    .persistent()
    .set(&DataKey::NextPendingId(product_id), &(next_id + 1));
```

### 4. Data Storage Changes

New storage key variant:

```rust
pub enum DataKey {
    // ... existing keys ...
    NextPendingId(String),  // NEW: Product ID → u64 (next ID counter)
}
```

**Example state:**

```
DataKey::NextPendingId("product-001") → 3
  (Next pending event for product-001 will have ID 3)

DataKey::PendingEvents("product-001") →
  [
    PendingEvent { pending_event_id: 0, ... },
    PendingEvent { pending_event_id: 1, ... },
    PendingEvent { pending_event_id: 2, ... },
  ]
```

### 5. Error Handling

**New error case:**

- `"pending event not found"` — When `pending_event_id` doesn't match any event (previously implicit in "event index out of bounds")

## Backward Compatibility & Migration

### Migration Helper Function

For clients currently using index-based references:

```rust
pub fn get_pending_event_id_at_index(
    env: Env,
    product_id: String,
    event_index: u32,
) -> u64
```

**Usage:**

```rust
// Old code:
client.approve_event(product_id, event_index, approver)

// New code:
let pending_id = client.get_pending_event_id_at_index(
    product_id,
    event_index
);
client.approve_event(product_id, pending_id, approver)
```

**Migration Path:**

1. Deploy contract with stable IDs
2. Clients query `get_pending_event_id_at_index()`
3. Clients convert index-based calls to ID-based calls
4. After grace period, remove index lookup function

## Semantics Guarantees

### Determinism

A given `(product_id, pending_event_id)` pair **always targets the same event**, regardless of queue mutations:

```
Scenario A: Approve ID=1 → modifies specific event
Scenario B: Reject ID=0, then approve ID=1 → still modifies the same event as Scenario A
```

### Idempotence

Approving twice with the same actor is safe:

```rust
// First approval
client.approve_event(prod_id, event_id=1, actor)
// Vector internally checks: if !contains, push_back

// Second approval (same actor, same ID)
client.approve_event(prod_id, event_id=1, actor)
// No-op: already contains actor
```

### Consistency

After removals, remaining events maintain their stable IDs:

```
Before: [ID=0, ID=1, ID=2]
Reject ID=1:
After:  [ID=0, ID=2]  ← ID=2 still has the same ID
```

## Testing Strategy

### Unit Tests (in smart-contract/contracts/src/tests.rs)

#### Test 1: Stable ID Generation

```rust
#[test]
fn test_pending_events_have_stable_ids() {
    // Add 3 events
    // Verify pending_event_id values are sequential: 0, 1, 2
    // Verify IDs are stored in PendingEvent struct
}
```

#### Test 2: ID-Based Targeting After Queue Mutation

```rust
#[test]
fn test_approve_uses_stable_id_not_index() {
    // 1. Add Event A, B, C with IDs 0, 1, 2
    // 2. Reject event at position 0 (ID=0)
    // 3. Queue is now [B (ID=1), C (ID=2)] at indices [0, 1]
    // 4. Approve by ID=2 (originally was at index 2)
    // 5. Verify C is approved, NOT the new event at index 1
}
```

#### Test 3: Reject by ID After Earlier Rejection

```rust
#[test]
fn test_reject_uses_stable_id_not_index() {
    // 1. Add Event A (ID=0), B (ID=1), C (ID=2)
    // 2. Reject ID=0 → [B(ID=1), C(ID=2)]
    // 3. Receive approval for B with some signatures
    // 4. Reject by ID=2 (C)
    // 5. Verify C is removed, not B
}
```

#### Test 4: Concurrent-Like Approve/Reject Sequence (Invariant I5)

```rust
#[test]
fn test_deterministic_add_approve_reject_sequence() {
    // Randomized sequence of add/approve/reject operations
    // Using pending_event_id consistently
    // Verify: final_finalized + final_pending + total_rejected = total_adds
}
```

#### Test 5: Duplicate Approval Prevention

```rust
#[test]
fn test_double_approver_same_event_counts_once() {
    // 1. Actor approves event (signature 1 of 2)
    // 2. Actor approves same event again
    // 3. Verify still need 1 more signature (not 0)
}
```

#### Test 6: Migration Compatibility

```rust
#[test]
fn test_get_pending_event_id_at_index_bridge() {
    // 1. Add 3 events (IDs: 0, 1, 2)
    // 2. Verify get_pending_event_id_at_index(0) = 0
    // 3. Verify get_pending_event_id_at_index(1) = 1
    // 4. Reject at ID=0
    // 5. Verify get_pending_event_id_at_index(0) = 1 (newly at index 0)
    // 6. Verify clients can use this to migrate
}
```

### Integration Tests (in smart-contract/contracts/src/invariants.rs)

#### Invariant I5: Queue Semantics After Mutation

```rust
/// Property: No matter the order of add/approve/reject with stable IDs,
/// a pending ID always refers to the same event until it's removed.
fn i5_stable_id_targeting_semantics()
```

## Client Interface Documentation

### For Frontend/Database

**Update contract interface docs:**

```
## approve_event(product_id, pending_event_id, approver, nonce)

Approve a pending event by its **stable identifier** (NOT index).

**Breaking Change**: The third parameter changed from `event_index: u32` to `pending_event_id: u64`.

**Migration**:
1. Call `get_pending_event_id_at_index(product_id, your_index)` to get the stable ID
2. Use the returned ID in approve_event/reject_event calls

**Determinism Guarantee**:
Approve the same `pending_event_id` produces identical results regardless of queue mutations.
```

## Storage Cost Impact

**Negligible:**

- `pending_event_id: u64` field adds 8 bytes per PendingEvent
- `NextPendingId(String)` storage entry adds per-product storage (one entry per product with multi-sig events)
- Linear lookup (`for i in 0..pending.len()`) is O(n), acceptable for small queues

## Deployment Checklist

- [x] Add `pending_event_id: u64` to PendingEvent struct
- [x] Add `NextPendingId(String)` to DataKey enum
- [x] Update add_tracking_event to generate stable IDs
- [x] Rewrite approve_event to use ID-based lookup
- [x] Rewrite reject_event to use ID-based lookup
- [x] Add get_pending_event_id_at_index helper
- [ ] Update all unit tests
- [ ] Update invariant tests
- [ ] Syntax check: `cargo check --lib`
- [ ] Run test suite: `cargo test`
- [ ] Update frontend documentation
- [ ] Deploy to testnet
- [ ] Update API versioning docs (new function signature)
- [ ] Notify clients of breaking change and migration path
