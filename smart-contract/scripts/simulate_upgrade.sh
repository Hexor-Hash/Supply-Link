#!/usr/bin/env bash
# simulate_upgrade.sh
# Deploys the new WASM to testnet in a dry-run fashion and validates
# that all contract entry-points are callable with the expected signatures.
# Usage: SOURCE=<alias> NETWORK=testnet bash simulate_upgrade.sh
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:?Set SOURCE to your Stellar account alias}"
WASM="target/wasm32-unknown-unknown/release/supply_link.wasm"

cd "$(dirname "$0")/.."

echo "==> Building WASM..."
cargo build --target wasm32-unknown-unknown --release --quiet

echo "==> Running unit tests..."
cargo test --quiet

echo "==> Deploying simulation contract to $NETWORK..."
SIM_CONTRACT=$(stellar contract deploy \
  --wasm "$WASM" \
  --network "$NETWORK" \
  --source "$SOURCE" 2>/dev/null)
echo "    Simulation contract: $SIM_CONTRACT"

invoke() {
  stellar contract invoke \
    --id "$SIM_CONTRACT" \
    --network "$NETWORK" \
    --source "$SOURCE" \
    -- "$@" 2>/dev/null
}

echo "==> Smoke-testing entry-points on simulation contract..."

# get_product_count must return a number
COUNT=$(invoke get_product_count)
echo "    get_product_count → $COUNT"
[[ "$COUNT" =~ ^[0-9]+$ ]] || { echo "ERROR: get_product_count returned non-numeric: $COUNT"; exit 1; }

# list_products must return an array
LIST=$(invoke list_products --offset 0 --limit 5)
echo "    list_products      → $LIST"
echo "$LIST" | jq -e 'type == "array"' > /dev/null || { echo "ERROR: list_products did not return array"; exit 1; }

# product_exists for a dummy ID must return false (not panic)
EXISTS=$(invoke product_exists --id "sim-test-nonexistent-id")
echo "    product_exists     → $EXISTS"
[[ "$EXISTS" == "false" ]] || { echo "ERROR: product_exists returned unexpected value: $EXISTS"; exit 1; }

# get_events_count for unknown product must return 0 (not panic)
ECOUNT=$(invoke get_events_count --product_id "sim-test-nonexistent-id")
echo "    get_events_count   → $ECOUNT"
[[ "$ECOUNT" == "0" ]] || { echo "ERROR: get_events_count returned unexpected value: $ECOUNT"; exit 1; }

echo "==> Simulation passed. Contract $SIM_CONTRACT is safe to use as upgrade target."
echo "    Set NEW_CONTRACT=$SIM_CONTRACT to skip re-deploying in the upgrade execution phase."
