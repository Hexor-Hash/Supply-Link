#!/usr/bin/env bash
# coverage.sh — Generate code coverage report for smart-contract
# Requires: cargo-llvm-cov (install via `cargo install cargo-llvm-cov`)
#
# Usage:
#   bash scripts/coverage.sh           # print text report to stdout
#   bash scripts/coverage.sh html      # generate HTML in target/llvm-cov/html
#   bash scripts/coverage.sh upload    # upload to Codecov (needs CODECOV_TOKEN)
#
set -euo pipefail

cd "$(dirname "$0")/.."

FORMAT="${1:-text}"

case "$FORMAT" in
  html)
    echo "==> Generating HTML coverage report..."
    cargo llvm-cov --profile coverage --html --open target/llvm-cov/html
    ;;
  upload)
    echo "==> Uploading coverage to Codecov..."
    if [[ -z "${CODECOV_TOKEN:-}" ]]; then
      echo "ERROR: CODECOV_TOKEN environment variable is required"
      exit 1
    fi
    cargo llvm-cov --profile coverage --lcov --output-path target/llvm-cov/lcov.info
    bash <(curl -s https://codecov.io/bash) -f target/llvm-cov/lcov.info
    ;;
  *)
    echo "==> Running coverage (threshold: lines>=80, functions>=80, branches>=80, statements>=80)"
    cargo llvm-cov --profile coverage --fail-under-lines 80 --fail-under-functions 80 --fail-under-branches 80 --fail-under-statements 80
    ;;
esac
