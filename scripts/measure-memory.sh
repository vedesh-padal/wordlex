#!/usr/bin/env bash
set -euo pipefail

if ! command -v ps >/dev/null 2>&1; then
  echo "ps command is required"
  exit 1
fi

rows="$(ps -eo pid=,comm=,args= | awk '
  $2 == "wordlex" || $2 ~ /^WebKit(Web|Network)/ {
    print $1 "," $2
  }')"
if [[ -z "${rows}" ]]; then
  echo "No WordLex/WebKit processes found."
  exit 0
fi

printf "%-8s %-22s %-12s %-12s\n" "PID" "PROCESS" "RSS_MB" "PSS_MB"
printf "%-8s %-22s %-12s %-12s\n" "--------" "----------------------" "------------" "------------"

total_rss_kb=0
total_pss_kb=0

while IFS=, read -r pid process_name; do
  [[ -z "${pid}" ]] && continue
  if [[ ! -r "/proc/${pid}/smaps_rollup" ]]; then
    continue
  fi

  rss_kb="$(awk '/^Rss:/ {print $2}' "/proc/${pid}/smaps_rollup")"
  pss_kb="$(awk '/^Pss:/ {print $2}' "/proc/${pid}/smaps_rollup")"

  rss_mb="$(awk -v kb="${rss_kb}" 'BEGIN {printf "%.1f", kb/1024}')"
  pss_mb="$(awk -v kb="${pss_kb}" 'BEGIN {printf "%.1f", kb/1024}')"

  printf "%-8s %-22s %-12s %-12s\n" "${pid}" "${process_name}" "${rss_mb}" "${pss_mb}"

  total_rss_kb=$((total_rss_kb + rss_kb))
  total_pss_kb=$((total_pss_kb + pss_kb))
done <<< "${rows}"

printf "\n%-31s %8.1f MB\n" "Total RSS:" "$(awk -v kb="${total_rss_kb}" 'BEGIN {print kb/1024}')"
printf "%-31s %8.1f MB\n" "Total PSS:" "$(awk -v kb="${total_pss_kb}" 'BEGIN {print kb/1024}')"
