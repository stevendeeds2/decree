# Decree `init` — design

## Problem

Enforcement works (`verify` + MCP), but adoption stalls on hand-authored `decree.contract.json`. Teams need: *point at a design-system package → get a valid contract → gate CI/agents*.

## Goal

Ship `decree init <package>` that writes a v1 `decree.contract.json` from an installed or local design-system package root.

## Non-goals (this slice)

- Figma import
- Hosted SaaS
- Perfect AST of every framework
- Auto-wiring CI/GitHub Actions
- Docs-from-contract / measurement

## CLI

```bash
decree init <path-or-package-name> [--out decree.contract.json] [--force]
```

| Flag | Behavior |
|------|----------|
| `<path>` | Directory containing `package.json`, or an npm package name resolved from `node_modules` (walk up from cwd) |
| `--out` | Output path (default: `./decree.contract.json`) |
| `--force` | Overwrite existing contract; without it, refuse if out exists |

Exit `0` on success, `1` on soft failures (no components found / missing package), `2` on usage errors.

## Contract generation

Same schema as today (`version: 1`, `components`, `tokens`, `nativeElementMap`, optional `name` / `package`).

### Components

1. Read `package.json` `exports` (and `main`/`module` if present).
2. Collect module paths that look like components:
   - basename matches `/^[A-Z][A-Za-z0-9]*\.(jsx?|tsx?|mjs|cjs)$/`
   - prefer paths under a `components` segment when present
3. For each candidate file, parse exported PascalCase names via lightweight regex:
   - `export function Name`
   - `export const Name =`
   - `export { Name` / `export { Name as Alias` (named exports; skip `default`)
4. Deduplicate, sort. Fail if empty.

### Tokens

Union of:

1. **CSS custom properties** under the package: definitions (`--name:`) and `var(--name)` references in `.css` / `.scss` files (ignore `node_modules` inside the package tree).
2. **`tokens.json`** (if present): flatten DTCG-like trees (`$value` leaves) to `--path-with-dashes` (`.` → `-`), matching SD33DS’s `toCssVarName` convention.

Token objects are `{ "name": "--…" }` (values optional). Deduplicate by name, sort.

### nativeElementMap

Heuristic only when the PascalCase component is present:

| Component | Native |
|-----------|--------|
| Button | button |
| Input | input |
| Textarea | textarea |
| Select | select |
| Label | label |
| Link | a |
| Checkbox | input |
| Radio | input |

Empty object is valid if nothing matches.

### Metadata

- `name`: package `name` from package.json (or directory basename)
- `package`: same when it looks like an npm name

## Fixtures / tests

- `fixtures/init-sample-pkg/` — tiny fake DS (Button, Input, CSS vars, optional tokens.json)
- Unit tests: build contract in memory; CLI writes file; refuse overwrite; `--force`; resolve by path
- Optional dogfood: if `@stevendeeds/sd33ds` path is available locally, assert Button ∈ components (skip if missing — not CI-blocking)

## Success criteria

1. `decree init fixtures/init-sample-pkg` writes a contract that `validateContract` accepts
2. Contract includes `Button`, `Input`, and discovered `--*` tokens
3. `decree verify` on a clean consumer of that contract can pass (sample or existing pattern)
4. Docs/README list `init` before `verify` in the get-started path
