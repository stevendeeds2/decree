# Brownfield baseline / max-new ratchet for `decree verify`

**Status:** implemented  
**Date:** 2026-08-06  
**Goal:** Make `decree verify` adoptable on noisy brownfield apps by comparing current findings to a checked-in baseline (and/or capping *new* findings), without changing absolute-mode behavior by default.

## Problem

Absolute verify turns real apps (shadcn kitchensinks, Radix playgrounds) into a wall of fail. Adoption needs a **ratchet**: day-one write a baseline, CI fails only on **new** debt, then burn down.

## Baseline file format (version 1)

```json
{
  "version": 1,
  "findings": [
    {
      "code": "DECREE_HARDCODED_HEX",
      "file": "src/Button.tsx",
      "line": 42,
      "messageFingerprint": "<hash>"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `version` | yes | Integer `1` for this format |
| `findings` | yes | Array of baselined finding records |
| `code` | yes | Finding code string |
| `file` | yes | Path as reported by verify (repo-relative) |
| `line` | no | Stored for humans / debugging; **not** part of the fingerprint |
| `messageFingerprint` | yes | Hash of the stable identity (see below) |

Unknown `version` → treat as error (exit 2 / usage-class failure), do not silently ignore.

## Fingerprint

```
fingerprint = hash(code + "|" + file + "|" + normalizedMessage)
```

- **Include:** `code`, `file`, normalized message text  
- **Exclude:** line number (edits that shift lines must not thrash the baseline)  
- **normalizedMessage:** trim; collapse internal whitespace to a single space; otherwise keep message text as emitted today  
- Hash algorithm: stable, hex-encoded digest (implementation detail in `baseline.js`; e.g. SHA-256 truncated or full — pick one and lock in tests)

Same finding at a different line → **same** fingerprint. Different code, file, or message → different fingerprint.

## Modes

| Mode | Behavior |
|------|----------|
| **default (absolute)** | Today’s verify: every finding counts; no baseline I/O |
| `--baseline <path>` | Load baseline; findings whose fingerprint is in the baseline are **baselined**; others are **new**. Fail only when there is at least one **new** finding (unless `--max-new` relaxes that) |
| `--write-baseline <path>` | Run scan, write current findings as a version-1 baseline to `<path>`, exit **0** (even if findings exist). Does not require a prior baseline |
| `--max-new <n>` | Fail if count of **new** findings `> n`. Usable with `--baseline` (new = not in baseline) or alone (every finding is “new” vs empty set). `n` is a non-negative integer |

### Combining flags

- `--baseline` + `--max-new N`: fail when `new > N` (so `N=0` ≡ fail on any new; `N≥1` allows a budget).  
- `--write-baseline` with `--baseline` / `--max-new`: write wins for exit semantics (exit 0 after write); documenting “prefer write alone” is enough for v1.  
- Absolute mode (neither baseline nor max-new): unchanged.

## Diff semantics

Given current findings `C` and baseline fingerprints `B`:

- **baselined** = findings in `C` whose fingerprint ∈ `B`  
- **new** = findings in `C` whose fingerprint ∉ `B`  
- Findings only in `B` (fixed since baseline) are ignored — baseline shrink is a separate `--write-baseline` refresh, not an automatic pass/fail signal in v1.

## Exit codes

Keep existing CLI contract:

| Code | Meaning |
|------|---------|
| `0` | Success — no failing condition for the active mode |
| `1` | Verify failed — findings that violate the active gate (absolute: any finding; baseline: new findings beyond allowed; max-new: `new > n`) |
| `2` | Usage / I/O / config error (missing baseline file when `--baseline` given, invalid JSON, bad `--max-new`, unsupported version, etc.) |

`--write-baseline` → **0** on successful write (scan may still have findings).

## Output

Print counts so CI logs are obvious:

```
decree verify: N new, M baselined, K total
```

- **K** = `|C|` (all current findings)  
- **M** = baselined count  
- **N** = new count  
- Absolute mode may omit new/baselined or report `N=K`, `M=0` — prefer the same shape for consistency once ratchet ships.

Per-finding listing for **new** findings should remain visible (same style as today’s finding output); baselined findings may be quiet or summarized — v1 minimum is the count line plus listing **new** findings on failure.

## Non-goals (this design)

- Auto-shrinking or “fixed debt” celebration beyond ignoring absent baseline entries  
- Fingerprints that include line numbers  
- Docs generator, measurement dashboards, or publish packaging (later tasks in the phase plan)

## Success criteria

- Fingerprint ignores line; unit tests lock that.  
- Fixture: two planted findings, baseline contains one → `--baseline` exits 1 with `1 new, 1 baselined`.  
- `--write-baseline` then `--baseline` → exit 0.  
- Absolute mode and pressure / MUI trial gates unchanged when ratchet flags are not passed.
