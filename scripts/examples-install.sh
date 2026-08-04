#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for dir in mui-from-npm radix-from-npm; do
  echo "npm install → examples/$dir"
  (cd "$ROOT/examples/$dir" && npm install --no-fund --no-audit)
done
echo "examples:install done"
