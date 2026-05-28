#!/usr/bin/env bash
# pre_upgrade_snapshot.sh
# Takes a snapshot of all on-chain state before a contract upgrade.
# Outputs JSON snapshot files and SHA-256 checksums to SNAPSHOT_DIR.
#
# Usage:
#   SNAPSHOT_DIR=./snapshots CONTRACT_ID=C... NETWORK=testnet SOURCE=deployer \
#     ./pre_upgrade_snapshot.sh
set -euo pipefail

CONTRACT_ID="${CONTRACT_ID:?Set CONTRACT_ID to the deployed contract address}"
NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:?Set SOURCE to your Stellar account alias}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-./snapshots/$(date +%Y%m%d_%H%M%S)}"

mkdir -p "$SNAPSHOT_DIR"

echo "📸 Taking pre-upgrade snapshot of $CONTRACT_ID on $NETWORK"
echo "   Output: $SNAPSHOT_DIR"

# ── Fetch product count ───────────────────────────────────────────────────────
echo "  → Fetching product count..."
PRODUCT_COUNT=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --source "$SOURCE" \
  -- get_product_count 2>/dev/null || echo "0")

echo "$PRODUCT_COUNT" > "$SNAPSHOT_DIR/product_count.txt"
echo "  → Product count: $PRODUCT_COUNT"

# ── Fetch all product IDs ─────────────────────────────────────────────────────
echo "  → Fetching product IDs (paginated)..."
PRODUCT_IDS_JSON="[]"
OFFSET=0
LIMIT=50

while true; do
  PAGE=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --network "$NETWORK" \
    --source "$SOURCE" \
    -- list_products --offset "$OFFSET" --limit "$LIMIT" 2>/dev/null || echo "[]")

  COUNT=$(echo "$PAGE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  if [ "$COUNT" -eq 0 ]; then break; fi

  PRODUCT_IDS_JSON=$(echo "$PRODUCT_IDS_JSON $PAGE" | python3 -c "
import sys, json
parts = sys.stdin.read().split()
combined = []
for p in parts:
    try: combined += json.loads(p)
    except: pass
print(json.dumps(combined))
")
  OFFSET=$((OFFSET + LIMIT))
done

echo "$PRODUCT_IDS_JSON" > "$SNAPSHOT_DIR/product_ids.json"
echo "  → Saved $(echo "$PRODUCT_IDS_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null) product IDs"

# ── Fetch each product and its events ────────────────────────────────────────
echo "  → Fetching product details and events..."
PRODUCTS_DIR="$SNAPSHOT_DIR/products"
mkdir -p "$PRODUCTS_DIR"

echo "$PRODUCT_IDS_JSON" | python3 -c "import sys,json; [print(p) for p in json.load(sys.stdin)]" | while read -r PRODUCT_ID; do
  SAFE_ID=$(echo "$PRODUCT_ID" | tr '/' '_')

  # Product metadata
  stellar contract invoke \
    --id "$CONTRACT_ID" \
    --network "$NETWORK" \
    --source "$SOURCE" \
    -- get_product --id "$PRODUCT_ID" \
    > "$PRODUCTS_DIR/${SAFE_ID}.json" 2>/dev/null || echo "{}" > "$PRODUCTS_DIR/${SAFE_ID}.json"

  # Event count
  EVENT_COUNT=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --network "$NETWORK" \
    --source "$SOURCE" \
    -- count_tracking_events --product_id "$PRODUCT_ID" 2>/dev/null || echo "0")

  # All events (paginated)
  EVENTS_JSON="[]"
  EV_OFFSET=0
  EV_LIMIT=100
  while true; do
    EV_PAGE=$(stellar contract invoke \
      --id "$CONTRACT_ID" \
      --network "$NETWORK" \
      --source "$SOURCE" \
      -- list_tracking_events --product_id "$PRODUCT_ID" --offset "$EV_OFFSET" --limit "$EV_LIMIT" \
      2>/dev/null || echo "[]")
    EV_COUNT=$(echo "$EV_PAGE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    if [ "$EV_COUNT" -eq 0 ]; then break; fi
    EVENTS_JSON=$(echo "$EVENTS_JSON $EV_PAGE" | python3 -c "
import sys, json
parts = sys.stdin.read().split()
combined = []
for p in parts:
    try: combined += json.loads(p)
    except: pass
print(json.dumps(combined))
")
    EV_OFFSET=$((EV_OFFSET + EV_LIMIT))
  done

  echo "$EVENTS_JSON" > "$PRODUCTS_DIR/${SAFE_ID}_events.json"
  echo "    ✓ $PRODUCT_ID ($EVENT_COUNT events)"
done

# ── Compute checksums ─────────────────────────────────────────────────────────
echo "  → Computing checksums..."
find "$SNAPSHOT_DIR" -name "*.json" -o -name "*.txt" | sort | xargs sha256sum > "$SNAPSHOT_DIR/checksums.sha256"

echo ""
echo "✅ Snapshot complete: $SNAPSHOT_DIR"
echo "   Files: $(find "$SNAPSHOT_DIR" -type f | wc -l)"
echo "   Checksums: $SNAPSHOT_DIR/checksums.sha256"
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
