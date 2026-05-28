# Resilience Test Suite

## Overview

This document describes the end-to-end resilience suite added in [issue #338](https://github.com/Supply-Links/Supply-Link/issues/338). The suite lives in `smart-contract/contracts/src/resilience_tests.rs` and runs automatically in CI.

## Test Categories

| Category               | Tests | Description                                                                                                     |
| ---------------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| Payload limits         | 10    | Boundary acceptance and over-limit rejection for `id`, `name`, `origin`, `location`, `metadata`                 |
| Unauthorized access    | 2     | Stranger blocked from `add_tracking_event`; non-owner blocked from `reject_event`                               |
| Duplicate registration | 1     | Same `id` registered twice panics                                                                               |
| Empty / ghost queries  | 6     | Safe defaults for all read functions on unknown product IDs                                                     |
| Nonce replay           | 2     | Consumed nonce and future nonce both rejected                                                                   |
| Multi-sig quorum       | 4     | Single approval stays pending; second approval finalizes; duplicate approver deduplication; reject clears queue |
| Governance safeguard   | 1     | Removing actor below `required_signatures` threshold is blocked                                                 |
| Full lifecycle         | 1     | Register → add actor → pending event → dual approve → transfer ownership                                        |
| Event count            | 1     | Counter increments correctly across sequential events                                                           |
| Pagination             | 1     | `list_products` returns correct slices at boundaries                                                            |

## Running Locally

```bash
cd smart-contract
cargo test resilience_tests
```

## CI Integration

Run `cargo test resilience_tests` locally before merging contract changes that affect failure handling, retries, or lifecycle recovery.

## Known Limitations

1. **No product deactivation function** — The `active` field exists on `Product` but no `deactivate_product` entry point is currently exposed. Resilience tests for inactive product behavior cannot be written until the function is added.
2. **No RPC / storage timeout simulation** — Soroban's test environment (`Env::default()`) is fully synchronous. Network-layer fault injection (RPC latency, ledger unavailability) requires an external integration test harness against a real Futurenet/Testnet node.
3. **No cross-contract call scenarios** — The contract does not currently call external contracts, so cross-contract failure modes are not applicable.

## Extending the Suite

Add new tests in `resilience_tests.rs` following the existing module pattern. Group related tests with a comment banner. To add a new fault category:

1. Add a `// ── N. Category name ──` section heading comment.
2. Write focused, single-behaviour test functions.
3. Use `#[should_panic(expected = "...")]` for all expected-failure paths.
4. Update this document's table.
