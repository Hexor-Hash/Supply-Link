#!/usr/bin/env bash
# scripts/cost_report.sh
#
# Runs the storage/cost profiling suite and formats a cost report.
# Output is written to cost_report.txt and printed to stdout.
#
# Usage:
#   cd smart-contract
#   bash scripts/cost_report.sh
#
# In CI, set FAIL_ON_BUDGET_BREACH=1 to exit non-zero if any budget assertion fails.

set -euo pipefail

REPORT="cost_report.txt"
FAIL_ON_BUDGET_BREACH="${FAIL_ON_BUDGET_BREACH:-0}"

echo "=== Supply-Link Storage & Cost Profiling Report ===" | tee "$REPORT"
echo "Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"

# Run only the profiling tests; capture output including println! lines.
# `--nocapture` is required to see the [COST] lines.
TEST_OUTPUT=$(cargo test --features testutils -- profiling --nocapture 2>&1 || true)

# Check for test failures
if echo "$TEST_OUTPUT" | grep -q "FAILED"; then
    echo "[ERROR] One or more profiling tests FAILED (budget threshold breached)." | tee -a "$REPORT"
    echo "" | tee -a "$REPORT"
    echo "$TEST_OUTPUT" | grep "FAILED" | tee -a "$REPORT"
    if [ "$FAIL_ON_BUDGET_BREACH" = "1" ]; then
        exit 1
    fi
fi

echo "## Raw Metrics" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"
printf "%-55s %20s %18s\n" "Operation" "CPU Instructions" "Memory Bytes" | tee -a "$REPORT"
printf "%-55s %20s %18s\n" "$(printf '%0.s-' {1..55})" "$(printf '%0.s-' {1..20})" "$(printf '%0.s-' {1..18})" | tee -a "$REPORT"

# Parse [COST] lines from test output
echo "$TEST_OUTPUT" | grep '\[COST\]' | while IFS= read -r line; do
    # Extract fields
    op=$(echo "$line"   | sed 's/\[COST\] //' | cut -d'|' -f1 | xargs)
    cpu=$(echo "$line"  | grep -oP 'cpu_instructions=\K[0-9]+' || echo "n/a")
    mem=$(echo "$line"  | grep -oP 'memory_bytes=\K[0-9]+'     || echo "n/a")
    note=$(echo "$line" | grep -oP 'NOTE=\K\S+'                || echo "")

    printf "%-55s %20s %18s" "$op" "$cpu" "$mem" | tee -a "$REPORT"
    if [ -n "$note" ]; then
        printf "  ⚠ %s" "$note" | tee -a "$REPORT"
    fi
    printf "\n" | tee -a "$REPORT"
done

echo "" | tee -a "$REPORT"
echo "## Budget Thresholds" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"
cat <<'EOF' | tee -a "$REPORT"
| Operation              | CPU Budget      | Storage Entries Budget |
|------------------------|-----------------|------------------------|
| register_product       | 2,500,000 instr | 210 (100 products)     |
| add_tracking_event     | 3,000,000 instr | 5 (50 events, 1 prod)  |

Thresholds are enforced as Rust assertions in contracts/src/profiling.rs.
Set FAIL_ON_BUDGET_BREACH=1 in CI to fail the pipeline on breach.
EOF

echo "" | tee -a "$REPORT"
echo "## Hotspot Analysis" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"
cat <<'EOF' | tee -a "$REPORT"
1. HOTSPOT — Unbounded Events Vec (DataKey::Events)
   All tracking events for a product are stored in a single persistent Vec.
   Deserialising this Vec on every add_tracking_event call costs O(n) CPU and
   memory as the event count grows. At 50 events the Vec serialisation already
   dominates the instruction budget.

   Optimization: Replace the single Vec with per-event keyed storage
   (DataKey::Event(product_id, index)) and a separate event counter key.
   This makes each write O(1) and avoids full-Vec deserialisation.

2. MINOR — ProductIndex scan in list_products
   list_products performs N individual storage reads (one per ProductIndex key)
   for each page. This is acceptable for small pages but grows linearly with
   page size. Pagination already caps the blast radius.

3. ACCEPTABLE — register_product
   Two storage writes (Product + ProductIndex) plus one read-modify-write on
   ProductCount. Cost is flat O(1) and well within budget.
EOF

echo "" | tee -a "$REPORT"
echo "Report written to smart-contract/$REPORT"
