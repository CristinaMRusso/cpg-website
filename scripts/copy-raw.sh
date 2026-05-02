#!/usr/bin/env bash
# scripts/01-copy-raw.sh
# Copies raw/ → dist/, wiping any previous dist/ first.
# raw/ is never modified by any subsequent step.

set -euo pipefail

RAW_DIR="raw"
DIST_DIR="dist"

echo "▶ Copying ${RAW_DIR}/ → ${DIST_DIR}/"
rm -rf "$DIST_DIR"
cp -r "$RAW_DIR" "$DIST_DIR"
echo "  Done."
