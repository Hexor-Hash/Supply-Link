# Implementation Plan: product_exists helper function

## Tasks

- [x] 1. Implement `product_exists` in lib.rs
  - Add `pub fn product_exists(env: Env, id: String) -> bool` to `#[contractimpl]`
  - Use `env.storage().persistent().has(&DataKey::Product(id))`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Add unit and property-based tests
  - `test_product_exists_returns_false_for_unknown` — unknown ID returns false
  - `test_product_exists_returns_true_after_register` — registered ID returns true
  - `prop_exists_iff_registered` — proptest: exists == registered (100 cases)
  - `prop_exists_false_before_register` — proptest: unregistered always false (100 cases)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Verify all tests pass
  - Run `cargo test` in `smart-contract/contracts/` and confirm all tests pass
  - _Requirements: all_
