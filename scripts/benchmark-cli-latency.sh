#!/usr/bin/env bash
set -euo pipefail

BIN_PATH="${1:-wordlex}"
WORD="${2:-ephemeral}"

if ! command -v "${BIN_PATH}" >/dev/null 2>&1; then
  echo "Binary not found: ${BIN_PATH}"
  exit 1
fi

measure() {
  local label="$1"
  shift
  local out
  out="$( { /usr/bin/time -f "%e" "${BIN_PATH}" "$@" >/dev/null; } 2>&1 )"
  echo "${label}: ${out}s"
}

echo "Benchmarking CLI latency for '${WORD}'"
measure "--cli" --cli "${WORD}"
measure "--cli-json" --cli-json "${WORD}"
measure "--search-json" --search-json "${WORD:0:3}"
measure "--random-json" --random-json
