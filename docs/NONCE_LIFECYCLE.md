# Nonce Lifecycle and Anti-Replay Protection

## Overview

The Supply-Link smart contract implements nonce-based anti-replay protection for privileged operations. This mechanism prevents replay attacks where a valid signed transaction could be resubmitted maliciously to repeat an action.

## Nonce Model

### Storage

Each actor (Stellar address) has an independent nonce counter stored in persistent contract storage under `DataKey::ActorNonce(Address)`. Nonces start at 0 and increment sequentially with each privileged operation.

### Scope

Nonces are scoped per actor address, not per product or operation type. This means:
- Each address maintains a single nonce counter across all operations
- Operations on different products by the same actor share the same nonce sequence
- Different actors have independent nonce counters

## Protected Operations

The following privileged operations enforce nonce validation:

1. **transfer_ownership** - Transferring product ownership to a new address
2. **add_authorized_actor** - Granting event submission permissions
3. **remove_authorized_actor** - Revoking event submission permissions
4. **approve_event** - Approving a pending multi-signature event
5. **reject_event** - Rejecting a pending multi-signature event

## Nonce Progression Rules

### Sequential Requirement

Nonces must be used in strict sequential order starting from 0. The contract validates that the provided nonce matches the current stored nonce for the actor before executing the operation.

**Valid sequence:**
```
Operation 1: nonce=0 → stored nonce becomes 1
Operation 2: nonce=1 → stored nonce becomes 2
Operation 3: nonce=2 → stored nonce becomes 3
```

**Invalid sequences:**
```
Operation 1: nonce=0 → stored nonce becomes 1
Operation 2: nonce=0 → REJECTED (stale nonce)

Operation 1: nonce=5 → REJECTED (future nonce, expected 0)

Operation 1: nonce=0 → stored nonce becomes 1
Operation 2: nonce=1 → stored nonce becomes 2
Operation 3: nonce=1 → REJECTED (stale nonce)
```

### Atomic Validation

Nonce validation and increment occur atomically within the same transaction:
1. Transaction signature is verified via `require_auth()`
2. Current nonce is retrieved from storage
3. Provided nonce is compared against current nonce
4. If match: nonce is incremented and operation proceeds
5. If mismatch: transaction panics with "invalid nonce"

## Client Responsibilities

### Querying Current Nonce

Before submitting a privileged operation, clients must query the current nonce for the signing actor:

```rust
let current_nonce = client.get_nonce(&actor_address);
```

### Submitting Operations

Include the current nonce when calling protected operations:

```rust
client.transfer_ownership(
    &product_id,
    &new_owner,
    &current_nonce  // Must match actor's current nonce
);
```

### Handling Nonce Failures

If a transaction fails with "invalid nonce":
1. Re-query the current nonce using `get_nonce()`
2. Verify no concurrent operations are in progress
3. Resubmit with the updated nonce value

### Concurrent Operations

Clients performing multiple operations concurrently must serialize nonce-protected operations or implement optimistic retry logic:

**Sequential approach (recommended):**
```rust
let nonce = client.get_nonce(&owner);
client.add_authorized_actor(&product_id, &actor1, &nonce);

let nonce = client.get_nonce(&owner);
client.add_authorized_actor(&product_id, &actor2, &nonce);
```

**Optimistic retry approach:**
```rust
loop {
    let nonce = client.get_nonce(&owner);
    match client.try_add_authorized_actor(&product_id, &actor, &nonce) {
        Ok(_) => break,
        Err(e) if e.contains("invalid nonce") => continue,
        Err(e) => return Err(e),
    }
}
```

## Security Considerations

### Replay Attack Prevention

The nonce mechanism prevents:
- **Exact replay**: Resubmitting a previously executed transaction
- **Cross-product replay**: Using a transaction from one product on another
- **Delayed replay**: Executing a captured transaction at a later time

### Nonce Exhaustion

Nonces are stored as `u64`, providing 2^64 possible values per actor. At 1 operation per second, this allows ~584 billion years of operations before exhaustion.

### Front-Running

Nonce protection does not prevent front-running attacks where an attacker observes a pending transaction and submits their own transaction with a higher fee. Applications requiring front-running protection should implement additional mechanisms such as commit-reveal schemes.

### Nonce Gaps

The contract does not allow nonce gaps. If a transaction with nonce N fails, subsequent transactions must still use nonce N (not N+1). This prevents accidental nonce desynchronization.

## Read-Only Operations

The following operations do not require nonces as they are read-only:
- `get_product`
- `get_tracking_events`
- `product_exists`
- `get_events_count`
- `get_authorized_actors`
- `get_product_count`
- `list_products`
- `get_pending_events`
- `get_nonce`

## Non-Protected Write Operations

The following write operations do not enforce nonce validation:
- `register_product` - Initial registration has no replay risk
- `add_tracking_event` - Event timestamps provide natural replay protection
- `update_product_metadata` - Lower sensitivity operation

These operations still require transaction signature authorization but do not increment or validate nonces.

## Migration and Compatibility

### Existing Deployments

For contracts deployed before nonce support:
- All actor nonces start at 0
- First privileged operation must use nonce=0
- No migration or initialization required

### Client Updates

Clients must be updated to:
1. Query nonces before privileged operations
2. Include nonce parameter in operation calls
3. Handle "invalid nonce" errors appropriately

### Backward Compatibility

The nonce parameter is a breaking change to the contract interface. Existing clients calling privileged operations without the nonce parameter will fail at the contract invocation level due to parameter mismatch.

## Testing

The contract includes comprehensive nonce tests covering:
- Initial nonce value (0)
- Nonce increment on successful operations
- Rejection of stale nonces (already used)
- Rejection of future nonces (not yet valid)
- Rejection of duplicate nonces
- Rejection of out-of-order nonces
- Nonce progression across multiple operations
- Nonce isolation between different actors

Run tests with:
```bash
cd smart-contract/contracts
cargo test
```

## Example Workflows

### Single Operation

```rust
// Query current nonce
let nonce = client.get_nonce(&owner);

// Execute operation with nonce
client.transfer_ownership(&product_id, &new_owner, &nonce);

// Nonce is now incremented to nonce + 1
```

### Multiple Sequential Operations

```rust
let mut nonce = client.get_nonce(&owner);

client.add_authorized_actor(&product_id, &actor1, &nonce);
nonce += 1;

client.add_authorized_actor(&product_id, &actor2, &nonce);
nonce += 1;

client.transfer_ownership(&product_id, &new_owner, &nonce);
```

### Multi-Signature Approval

```rust
// First approver
let nonce1 = client.get_nonce(&approver1);
client.approve_event(&product_id, &event_index, &approver1, &nonce1);

// Second approver (independent nonce)
let nonce2 = client.get_nonce(&approver2);
client.approve_event(&product_id, &event_index, &approver2, &nonce2);
```

## API Reference

### get_nonce

```rust
pub fn get_nonce(env: Env, actor: Address) -> u64
```

Returns the current nonce value for the specified actor address. Returns 0 if the actor has never performed a nonce-protected operation.

**Parameters:**
- `env`: Soroban execution environment
- `actor`: Address to query nonce for

**Returns:** Current nonce value as u64

**Authorization:** None (read-only)

### Protected Operation Signatures

All protected operations now include a `nonce: u64` parameter:

```rust
pub fn transfer_ownership(env: Env, product_id: String, new_owner: Address, nonce: u64) -> bool
pub fn add_authorized_actor(env: Env, product_id: String, actor: Address, nonce: u64) -> bool
pub fn remove_authorized_actor(env: Env, product_id: String, actor: Address, nonce: u64) -> bool
pub fn approve_event(env: Env, product_id: String, event_index: u32, approver: Address, nonce: u64) -> bool
pub fn reject_event(env: Env, product_id: String, event_index: u32, rejector: Address, nonce: u64) -> bool
```

## Support

For questions or issues related to nonce handling, please refer to the test suite in `smart-contract/contracts/src/tests.rs` for concrete examples of correct usage patterns.
