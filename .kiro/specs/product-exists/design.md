# Design: product_exists helper function

## Approach

Single read-only contract method added to `#[contractimpl]`. Uses `has()` on persistent storage — no deserialization, O(1) cost.

## Implementation

```rust
/// Returns true if a product with the given id is registered, false otherwise.
pub fn product_exists(env: Env, id: String) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Product(id))
}
```

Added to `SupplyLinkContract` in `smart-contract/contracts/src/lib.rs`, alongside `get_product` and `get_events_count`.

## Tests

Unit tests (in `#[cfg(test)] mod tests`):

| Test | Validates |
|------|-----------|
| `test_product_exists_returns_false_for_unknown` | Req 1.2, 1.3 |
| `test_product_exists_returns_true_after_register` | Req 1.1 |
| `prop_exists_iff_registered` (proptest, 100 cases) | Req 1.1, 1.2, 1.3 |
| `prop_exists_false_before_register` (proptest, 100 cases) | Req 1.2, 1.3 |
