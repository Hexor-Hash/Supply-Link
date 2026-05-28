#!/usr/bin/env bash
# post_upgrade_smoke_test.sh
# Verifies that the upgraded contract preserves all state from the snapshot.
# Compares product metadata and event counts against the pre-upgrade snapshot.
#
# Usage:
#   SNAPSHOT_DIR=./snapshots/20260101_120000 CONTRACT_ID=C... NETWORK=testnet SOURCE=deployer \
#     ./post_upgrade_smoke_test.sh
set -euo pipefail

CONTRACT_ID="${CONTRACT_ID:?Set CONTRACT_ID to the NEW deployed contract address}"
NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:?Set SOURCE to your Stellar account alias}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:?Set SNAPSHOT_DIR to the pre-upgrade snapshot directory}"

echo "🔍 Post-upgrade smoke test"
echo "   Contract: $CONTRACT_ID"
echo "   Snapshot: $SNAPSHOT_DIR"
echo ""

PASS=0
FAIL=0

# ── Verify product count ──────────────────────────────────────────────────────
EXPECTED_COUNT=$(cat "$SNAPSHOT_DIR/product_count.txt")
ACTUAL_COUNT=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --source "$SOURCE" \
  -- get_product_count 2>/dev/null || echo "-1")

if [ "$ACTUAL_COUNT" = "$EXPECTED_COUNT" ]; then
  echo "  ✅ Product count: $ACTUAL_COUNT"
  PASS=$((PASS + 1))
else
  echo "  ❌ Product count mismatch: expected=$EXPECTED_COUNT actual=$ACTUAL_COUNT"
  FAIL=$((FAIL + 1))
fi

# ── Verify each product ───────────────────────────────────────────────────────
PRODUCTS_DIR="$SNAPSHOT_DIR/products"

for PRODUCT_FILE in "$PRODUCTS_DIR"/*.json; do
  [[ "$PRODUCT_FILE" == *_events.json ]] && continue
  SAFE_ID=$(basename "$PRODUCT_FILE" .json)
  PRODUCT_ID=$(python3 -c "import json; d=json.load(open('$PRODUCT_FILE')); print(d.get('id',''))" 2>/dev/null || echo "")
  [ -z "$PRODUCT_ID" ] && continue

  # Check product still exists
  EXISTS=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --network "$NETWORK" \
    --source "$SOURCE" \
    -- product_exists --id "$PRODUCT_ID" 2>/dev/null || echo "false")

  if [ "$EXISTS" = "true" ]; then
    PASS=$((PASS + 1))
  else
    echo "  ❌ Product missing after upgrade: $PRODUCT_ID"
    FAIL=$((FAIL + 1))
    continue
  fi

  # Check event count matches
  EVENTS_FILE="$PRODUCTS_DIR/${SAFE_ID}_events.json"
  if [ -f "$EVENTS_FILE" ]; then
    EXPECTED_EVENTS=$(python3 -c "import json; print(len(json.load(open('$EVENTS_FILE'))))" 2>/dev/null || echo "0")
    ACTUAL_EVENTS=$(stellar contract invoke \
      --id "$CONTRACT_ID" \
      --network "$NETWORK" \
      --source "$SOURCE" \
      -- count_tracking_events --product_id "$PRODUCT_ID" 2>/dev/null || echo "-1")

    if [ "$ACTUAL_EVENTS" = "$EXPECTED_EVENTS" ]; then
      echo "  ✅ $PRODUCT_ID: $ACTUAL_EVENTS events"
      PASS=$((PASS + 1))
    else
      echo "  ❌ $PRODUCT_ID: event count mismatch expected=$EXPECTED_EVENTS actual=$ACTUAL_EVENTS"
      FAIL=$((FAIL + 1))
    fi
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────"
echo "  Results: $PASS passed, $FAIL failed"
echo "─────────────────────────────────────"

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Smoke test FAILED — consider rollback"
  exit 1
else
  echo "✅ Smoke test PASSED — state preserved"
  exit 0
fi
# Validates data and event continuity on the new contract against the snapshot.
# Exits 0 on success, 1 on any failure (triggers rollback).
# Usage: NEW_CONTRACT=<addr> SOURCE=<alias> NETWORK=testnet bash post_upgrade_smoke_test.sh
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:?Set SOURCE to your Stellar account alias}"
NEW_CONTRACT="${NEW_CONTRACT:?Set NEW_CONTRACT to the new contract address}"

SNAPSHOT=$(ls -t upgrade-snapshot-*.json 2>/dev/null | head -1)
[[ -z "$SNAPSHOT" ]] && { echo "ERROR: No snapshot file found."; exit 1; }
echo "==> Verifying against snapshot: $SNAPSHOT"

invoke() {
  stellar contract invoke --id "$NEW_CONTRACT" --network "$NETWORK" --source "$SOURCE" -- "$@" 2>/dev/null
}

FAILURES=0
fail() { echo "FAIL: $*"; FAILURES=$((FAILURES+1)); }

# 1. Product count
EXPECTED_COUNT=$(jq '.product_count' "$SNAPSHOT")
ACTUAL_COUNT=$(invoke get_product_count)
echo "    product_count: expected=$EXPECTED_COUNT actual=$ACTUAL_COUNT"
[[ "$ACTUAL_COUNT" == "$EXPECTED_COUNT" ]] || fail "product_count mismatch"

# 2. product_exists for known IDs (spot-check up to 5)
mapfile -t SPOT_IDS < <(jq -r '.product_ids[]' "$SNAPSHOT" | shuf | head -5)
for pid in "${SPOT_IDS[@]}"; do
  EXISTS=$(invoke product_exists --id "$pid")
  echo "    product_exists($pid) → $EXISTS"
  [[ "$EXISTS" == "true" ]] || fail "product_exists returned false for known product: $pid"
done

# 3. Event count continuity for spot-checked products
for pid in "${SPOT_IDS[@]}"; do
  EXPECTED_EV=$(jq --arg k "$pid" '.event_counts[$k] // 0' "$SNAPSHOT")
  ACTUAL_EV=$(invoke get_events_count --product_id "$pid")
  echo "    event_count($pid): expected=$EXPECTED_EV actual=$ACTUAL_EV"
  [[ "$ACTUAL_EV" == "$EXPECTED_EV" ]] || fail "event_count mismatch for $pid"
done

# 4. product_exists for unknown ID must return false
GHOST=$(invoke product_exists --id "smoke-test-nonexistent-$(date +%s)")
echo "    product_exists(unknown) → $GHOST"
[[ "$GHOST" == "false" ]] || fail "product_exists returned true for unknown product"

# 5. get_events_count for unknown product must return 0
GHOST_EV=$(invoke get_events_count --product_id "smoke-test-nonexistent-$(date +%s)")
echo "    get_events_count(unknown) → $GHOST_EV"
[[ "$GHOST_EV" == "0" ]] || fail "get_events_count returned non-zero for unknown product"

echo ""
if [[ "$FAILURES" -gt 0 ]]; then
  echo "==> POST-UPGRADE VERIFICATION FAILED ($FAILURES failure(s)). Initiate rollback."
  exit 1
fi
echo "==> All post-upgrade checks passed. Upgrade successful."
