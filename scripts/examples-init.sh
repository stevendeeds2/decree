#!/usr/bin/env bash
# Re-run decree init against installed third-party packages and refresh full dumps.
# Curated clean/dirty contracts are not overwritten (hand-maintained allowlists).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/bin/decree.js"

node "$CLI" init "$ROOT/examples/mui-from-npm/node_modules/@mui/material" \
  --out "$ROOT/examples/mui-from-npm/init.full.contract.json" --force

node "$CLI" init "$ROOT/examples/radix-from-npm/node_modules/@radix-ui/themes" \
  --out "$ROOT/examples/radix-from-npm/init.full.contract.json" --force

echo "examples:init done (full dumps refreshed; curated contracts unchanged)"
