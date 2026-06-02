#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_DIR="${ROOT_DIR}/src-tauri/target/release/bundle/deb"
ARCHIVE_DIR="${ROOT_DIR}/build-artifacts/deb-archive"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${ARCHIVE_DIR}/checksums-${STAMP}.txt"

mkdir -p "${ARCHIVE_DIR}"

if [[ ! -d "${BUNDLE_DIR}" ]]; then
  echo "Bundle directory does not exist yet: ${BUNDLE_DIR}"
  exit 0
fi

mapfile -t debs < <(ls "${BUNDLE_DIR}"/*.deb 2>/dev/null || true)
if [[ "${#debs[@]}" -eq 0 ]]; then
  echo "No .deb artifacts found in ${BUNDLE_DIR}"
  exit 0
fi

echo "Archiving ${#debs[@]} .deb artifact(s) to ${ARCHIVE_DIR}/${STAMP}"
mkdir -p "${ARCHIVE_DIR}/${STAMP}"

for deb in "${debs[@]}"; do
  cp --update=none "${deb}" "${ARCHIVE_DIR}/${STAMP}/"
done

sha256sum "${ARCHIVE_DIR}/${STAMP}/"*.deb > "${LOG_FILE}"
echo "Checksums written to ${LOG_FILE}"
