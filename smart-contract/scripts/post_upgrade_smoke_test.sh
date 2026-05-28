#!/usr/bin/env bash
# post_upgrade_smoke_test.sh
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
