#!/usr/bin/env bash
# migrate_state.sh
# Reads the latest upgrade snapshot and re-registers all products + events
# on the new contract. Idempotent: skips products that already exist.
# Usage: NEW_CONTRACT=<addr> SOURCE=<alias> NETWORK=testnet bash migrate_state.sh
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:?Set SOURCE to your Stellar account alias}"
NEW_CONTRACT="${NEW_CONTRACT:?Set NEW_CONTRACT to the new contract address}"
OLD_CONTRACT="${OLD_CONTRACT:?Set OLD_CONTRACT to the old contract address}"

# Find the most recent snapshot
SNAPSHOT=$(ls -t upgrade-snapshot-*.json 2>/dev/null | head -1)
[[ -z "$SNAPSHOT" ]] && { echo "ERROR: No snapshot file found. Run pre_upgrade_snapshot.sh first."; exit 1; }
echo "==> Using snapshot: $SNAPSHOT"

invoke_old() {
  stellar contract invoke --id "$OLD_CONTRACT" --network "$NETWORK" --source "$SOURCE" -- "$@" 2>/dev/null
}
invoke_new() {
  stellar contract invoke --id "$NEW_CONTRACT" --network "$NETWORK" --source "$SOURCE" -- "$@" 2>/dev/null
}

PRODUCT_IDS=$(jq -r '.product_ids[]' "$SNAPSHOT")
ERRORS=0

while IFS= read -r pid; do
  # Skip if already migrated
  EXISTS=$(invoke_new product_exists --id "$pid")
  if [[ "$EXISTS" == "true" ]]; then
    echo "    SKIP (already exists): $pid"
    continue
  fi

  # Fetch product details from old contract
  PRODUCT=$(invoke_old get_product --id "$pid")
  NAME=$(echo "$PRODUCT" | jq -r '.name')
  ORIGIN=$(echo "$PRODUCT" | jq -r '.origin')
  OWNER=$(echo "$PRODUCT" | jq -r '.owner')

  echo "    Migrating product: $pid"
  invoke_new register_product \
    --id "$pid" \
    --name "$NAME" \
    --origin "$ORIGIN" \
    --owner "$OWNER" || { echo "ERROR: Failed to register $pid"; ERRORS=$((ERRORS+1)); continue; }

  # Replay events
  EVENTS=$(invoke_old get_tracking_events --product_id "$pid")
  EVENT_COUNT=$(echo "$EVENTS" | jq 'length')
  for i in $(seq 0 $((EVENT_COUNT - 1))); do
    EV=$(echo "$EVENTS" | jq ".[$i]")
    invoke_new add_tracking_event \
      --product_id "$pid" \
      --caller "$(echo "$EV" | jq -r '.actor')" \
      --location "$(echo "$EV" | jq -r '.location')" \
      --event_type "$(echo "$EV" | jq -r '.event_type')" \
      --metadata "$(echo "$EV" | jq -r '.metadata')" || { echo "ERROR: Failed to replay event $i for $pid"; ERRORS=$((ERRORS+1)); }
  done
done <<< "$PRODUCT_IDS"

if [[ "$ERRORS" -gt 0 ]]; then
  echo "==> Migration completed with $ERRORS error(s). Review output above."
  exit 1
fi
echo "==> Migration completed successfully."
