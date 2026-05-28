# Requirements: product_exists helper function

## Overview
Several contract functions panic with "product not found" when given an unknown product ID. The frontend and other contracts need a non-panicking way to check whether a product exists before calling those functions.

## User Stories

**US-1:** As a frontend developer, I want to call `product_exists(env, id)` so that I can check whether a product is registered without risking a panic.

**US-2:** As a smart contract developer, I want a lightweight existence check that uses `env.storage().persistent().has(...)` so that no deserialization cost is incurred.

## Functional Requirements

| ID  | Requirement |
|-----|-------------|
| 1.1 | `product_exists(env, id) -> bool` MUST return `true` when a product with the given `id` has been registered. |
| 1.2 | `product_exists(env, id) -> bool` MUST return `false` when no product with the given `id` exists in storage. |
| 1.3 | The function MUST NOT panic under any input. |
| 1.4 | The implementation MUST use `env.storage().persistent().has(&DataKey::Product(id))`. |

## Acceptance Criteria

- `product_exists` returns `true` after `register_product` is called with the same ID.
- `product_exists` returns `false` for an ID that has never been registered.
- `product_exists` returns `false` after only `add_tracking_event` has been called (no registration).
- All existing tests continue to pass.
