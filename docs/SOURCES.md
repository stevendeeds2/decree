# Decree sources (`decree.sources.json`)

Declare **where truth lives** so `init` / `prepare` emit a clean contract — no hand-pruning of `--tw-*` noise or accidental `App` exports.

## Why

`decree init` without sources walks the whole package (legacy). That dump is a starting point, not publishable law.

Design-system teams should:

1. `decree sources` — scaffold `decree.sources.json` (every option key, empty values)  
2. Fill `components.include` + token paths  
3. Run `decree prepare` on every release  
4. Ship `decree.contract.json` inside the package  
5. Let apps `decree use @acme/ds` — copy the curated contract  

The contract is a **governance backend artifact**, updated at the tail of a DS change.

## Scaffold

```bash
# From the design-system package root (or pass the path)
decree sources
decree sources ./packages/ui --force   # overwrite
```

Writes every schema key so you fill a form instead of inventing a format:

```json
{
  "version": 1,
  "components": {
    "include": [],
    "exclude": []
  },
  "tokens": {
    "mode": "css-allowlist",
    "files": [],
    "cssAllowlist": []
  },
  "ignoreComponentNames": [],
  "nativeElementMap": {}
}
```

### Fields

| Key | Purpose |
|-----|---------|
| `components.include` | Dirs/files that own public components (required for a useful prepare) |
| `components.exclude` | Globs to skip (stories, tests, …) |
| `tokens.mode` | `dtcg-only` \| `css-allowlist` \| `legacy-scan` |
| `tokens.files` | DTCG / JSON token files (with `dtcg-only` or alongside CSS) |
| `tokens.cssAllowlist` | CSS files whose `--*` vars become contract tokens |
| `ignoreComponentNames` | Drop accidental exports (`App`, `ThemeProvider`, …) |
| `nativeElementMap` | Map native tags → allowlisted components (`"a": "Button"`) |

### Token modes

| Mode | Behavior |
|------|----------|
| `dtcg-only` | Only listed `tokens.json` (DTCG) files — **recommended** when you have DTCG |
| `css-allowlist` | Only CSS files in `cssAllowlist` (+ optional token files) — scaffold default |
| `legacy-scan` | Full CSS walk (noisy; escape hatch) |

## Filled example

```json
{
  "version": 1,
  "components": {
    "include": ["src/components/ui"],
    "exclude": ["**/*.stories.*", "**/*.test.*"]
  },
  "tokens": {
    "mode": "dtcg-only",
    "files": ["tokens.json"]
  },
  "ignoreComponentNames": ["App", "Page", "Layout"],
  "nativeElementMap": {
    "button": "Button",
    "input": "Input",
    "a": "Button"
  }
}
```

## Commands

```bash
# DS package root
decree sources                 # scaffold sources (once)
decree prepare                 # write decree.contract.json from sources
decree prepare --check         # fail if committed contract drifted

# still supported
decree init ./packages/ds --force
# warns if no decree.sources.json

# consumer app
decree use @acme/ds --force    # copy published contract → ./decree.contract.json
decree verify .
```

Point `package.json` at the shipped contract:

```json
{
  "name": "@acme/ds",
  "files": ["dist", "decree.contract.json", "decree.sources.json"],
  "decree": "./decree.contract.json"
}
```

Suggested `prepublishOnly`: `decree prepare && decree prepare --check`

## Legacy

No `decree.sources.json` → full scan + stderr warning pointing here. Run `decree sources` first.
