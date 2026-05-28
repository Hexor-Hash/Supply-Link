# Contract Upgrade & Migration Runbook

> Applies to: Supply-Link Soroban smart contract on Stellar Testnet / Mainnet.

---

## Overview

Soroban contracts are **immutable once deployed**. An "upgrade" means deploying a
new contract instance and migrating all persistent state (products + events) to
it. The old contract address is retired; clients must be updated to point at the
new address.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| `stellar-cli` | ≥ 21 | `stellar --version` |
| `cargo` + `wasm32` target | stable | `rustup target list --installed` |
| `jq` | any | `jq --version` |
| Funded Stellar account alias | — | `stellar keys ls` |

Environment variables used throughout this runbook:

```bash
export NETWORK=testnet          # or mainnet
export SOURCE=alice             # stellar keys alias
export OLD_CONTRACT=<old-address>
export NEW_CONTRACT=<new-address>   # set after deploy step
```

---

## Phase 1 – Preflight (Pre-Upgrade)

Run **before** any deployment.

### 1.1 Snapshot current state

```bash
bash smart-contract/scripts/pre_upgrade_snapshot.sh
# Writes: upgrade-snapshot-<timestamp>.json
```

The snapshot captures:
- Total product count
- All product IDs (paginated)
- Event counts per product
- Contract WASM hash

### 1.2 Validate the new WASM

```bash
cd smart-contract
cargo build --target wasm32-unknown-unknown --release
cargo test   # must pass 100 %
```

### 1.3 Dry-run simulation

```bash
bash smart-contract/scripts/simulate_upgrade.sh
```

Checks:
- New contract compiles and deploys to a local/testnet sandbox
- All functions callable with existing data shapes
- No breaking changes in `Product` or `TrackingEvent` field names

### 1.4 Rollback decision gate

Proceed only if **all** of the following are true:

- [ ] `cargo test` passes
- [ ] Snapshot completed without errors
- [ ] Simulation reports no schema mismatches
- [ ] Maintainer sign-off obtained (PR approved)

---

## Phase 2 – Execution (Upgrade)

### 2.1 Deploy new contract

```bash
SOURCE=$SOURCE bash smart-contract/scripts/deploy.sh
# Copy the printed contract address → set NEW_CONTRACT
export NEW_CONTRACT=<printed-address>
```

### 2.2 Migrate state

```bash
bash smart-contract/scripts/migrate_state.sh
# Reads upgrade-snapshot-<timestamp>.json
# Re-registers all products and replays all events on NEW_CONTRACT
```

Monitor output for any `ERROR` lines. The script is idempotent — safe to re-run.

### 2.3 Update client configuration

In `frontend/.env.local` (and CI secrets):

```env
NEXT_PUBLIC_CONTRACT_ID=<NEW_CONTRACT>
```

Redeploy the frontend after updating the env var.

---

## Phase 3 – Post-Upgrade Verification

```bash
bash smart-contract/scripts/post_upgrade_smoke_test.sh
```

The smoke test asserts:

| Check | Expected |
|---|---|
| `get_product_count` on new contract | equals snapshot count |
| Spot-check 5 random products | fields match snapshot |
| Event counts per spot-checked product | match snapshot |
| `product_exists` for known IDs | `true` |
| `product_exists` for unknown ID | `false` |
| `add_tracking_event` on new contract | succeeds |

A non-zero exit code means verification failed → trigger rollback.

---

## Phase 4 – Rollback

### Conditions that trigger rollback

- Post-upgrade smoke test exits non-zero
- Any product count mismatch > 0
- Any event count mismatch > 0
- Client errors reported within 30 minutes of go-live

### Rollback steps

1. Revert `NEXT_PUBLIC_CONTRACT_ID` to `OLD_CONTRACT` in env and redeploy frontend.
2. Notify team in `#supply-link-ops` with the rollback reason.
3. Open a post-mortem issue referencing the failed upgrade attempt.
4. The old contract remains live; no data is lost (Soroban state is immutable).

> **Note:** The old contract cannot be "re-activated" — it was never deactivated.
> Rolling back is simply pointing clients back at the old address.

---

## Dry-Run Checklist

Use this checklist to rehearse the upgrade on testnet before mainnet.

```
[ ] 1. Set NETWORK=testnet, SOURCE=<testnet-alias>
[ ] 2. Run pre_upgrade_snapshot.sh  → snapshot file created
[ ] 3. Run simulate_upgrade.sh      → exits 0
[ ] 4. Run deploy.sh                → new contract address printed
[ ] 5. Run migrate_state.sh         → no ERROR lines
[ ] 6. Update .env.local, restart frontend
[ ] 7. Run post_upgrade_smoke_test.sh → exits 0
[ ] 8. Manual QR scan of a migrated product → history visible
[ ] 9. Document results in upgrade log
```

---

## Upgrade Log

| Date | Network | Old Address | New Address | Outcome | Author |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
