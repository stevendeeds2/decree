#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/bin/decree.js"

fail=0
for target in \
  examples/mui-from-npm/clean \
  examples/radix-from-npm/clean \
  fixtures/shadcn-clean \
  fixtures/mui-clean \
  examples/radix-themes-clean
do
  echo "VERIFY CLEAN $target"
  node "$CLI" verify "$ROOT/$target" || fail=1
done

for target in \
  examples/mui-from-npm/dirty \
  examples/radix-from-npm/dirty \
  fixtures/shadcn-dirty \
  fixtures/mui-dirty \
  examples/radix-themes-dirty
do
  echo "VERIFY DIRTY (expect fail) $target"
  if node "$CLI" verify "$ROOT/$target"; then
    echo "ERROR: expected failure for $target"
    fail=1
  else
    echo "ok: dirty failed as expected"
  fi
done

exit "$fail"
