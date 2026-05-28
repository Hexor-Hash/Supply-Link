#!/usr/bin/env bash
# pre_upgrade_snapshot.sh
# Captures current contract state before an upgrade.
# Usage: OLD_CONTRACT=<addr> SOURCE=<alias> NETWORK=testnet bash pre_upgrade_snapshot.sh
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:?Set SOURCE to your Stellar account alias}"
OLD_CONTRACT="${OLD_CONTRACT:?Set OLD_CONTRACT to the current contract address}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT="upgrade-snapshot-${TIMESTAMP}.json"

echo "==> Snapshotting contract $OLD_CONTRACT on $NETWORK"

invoke() {
  stellar contract invoke \
    --id "$OLD_CONTRACT" \
    --network "$NETWORK" \
    --source "$SOURCE" \
    -- "$@" 2>/dev/null
}

# Total product count
PRODUCT_COUNT=$(invoke get_product_count)
echo "    Product count: $PRODUCT_COUNT"

# Paginate all product IDs (100 at a time)
ALL_IDS="[]"
OFFSET=0
LIMIT=100
while true; do
  PAGE=$(invoke list_products --offset "$OFFSET" --limit "$LIMIT")
  PAGE_LEN=$(echo "$PAGE" | jq 'length')
  ALL_IDS=$(echo "$ALL_IDS $PAGE" | jq -s 'add')
  [ "$PAGE_LEN" -lt "$LIMIT" ] && break
  OFFSET=$((OFFSET + LIMIT))
done

# Event counts per product
EVENT_COUNTS="{}"
while IFS= read -r pid; do
  COUNT=$(invoke get_events_count --product_id "$pid")
  EVENT_COUNTS=$(echo "$EVENT_COUNTS" | jq --arg k "$pid" --argjson v "$COUNT" '. + {($k): $v}')
done < <(echo "$ALL_IDS" | jq -r '.[]')

# WASM hash of current deployment
WASM_HASH=$(stellar contract info --id "$OLD_CONTRACT" --network "$NETWORK" 2>/dev/null | grep -i 'wasm' | awk '{print $NF}' || echo "unknown")

jq -n \
  --arg ts "$TIMESTAMP" \
  --arg network "$NETWORK" \
  --arg contract "$OLD_CONTRACT" \
  --arg wasm_hash "$WASM_HASH" \
  --argjson product_count "$PRODUCT_COUNT" \
  --argjson product_ids "$ALL_IDS" \
  --argjson event_counts "$EVENT_COUNTS" \
  '{
    timestamp: $ts,
    network: $network,
    contract: $contract,
    wasm_hash: $wasm_hash,
    product_count: $product_count,
    product_ids: $product_ids,
    event_counts: $event_counts
  }' > "$OUT"

echo "==> Snapshot written to $OUT"
