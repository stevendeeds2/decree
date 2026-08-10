# Decree sources (`decree.sources.json`)

Declare **where truth lives** so `init` / `prepare` emit a clean contract — no hand-pruning of `--tw-*` noise or accidental `App` exports.

## Why

`decree init` without sources walks the whole package (legacy). That dump is a starting point, not publishable law.

Design-system teams should:

1. Add `decree.sources.json` once  
2. Run `decree prepare` on every release  
3. Ship `decree.contract.json` inside the package  
4. Let apps `decree use @acme/ds` — copy the curated contract  

The contract is a **governance backend artifact**, updated at the tail of a DS change.

## Example

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
  "ignoreComponentNames": ["App", "Page", "Layout"]
}
```

### Token modes

| Mode | Behavior |
|------|----------|
| `dtcg-only` | Only listed `tokens.json` (DTCG) files — **recommended** |
| `css-allowlist` | Only CSS files in `cssAllowlist` (+ optional token files) |
| `legacy-scan` | Full CSS walk (noisy; escape hatch) |

## Commands

```bash
# DS package root
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

No `decree.sources.json` → full scan + stderr warning pointing here.
