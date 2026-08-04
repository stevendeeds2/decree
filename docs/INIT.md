# Decree `init`

Bootstrap a v1 `decree.contract.json` from a design-system package so teams can gate without hand-writing the inventory.

## Usage

```bash
node bin/decree.js init <path-or-package-name> [--out decree.contract.json] [--force]
```

| Input | Behavior |
|-------|----------|
| Directory with `package.json` | Used as package root |
| npm name (e.g. `@stevendeeds/sd33ds`) | Resolved from `node_modules` walking up from cwd |
| `--out` | Output path (default `./decree.contract.json`) |
| `--force` | Overwrite existing contract |

## What it extracts

- **Components** — PascalCase modules from `exports` + package walk; exported `function` / `const` names  
- **Tokens** — CSS `--*` from `.css`/`.scss`, plus flattened `tokens.json` DTCG paths (`a.b` → `--a-b`)  
- **nativeElementMap** — heuristics (`Button`→`button`, `Input`→`input`, …)

## After init

```bash
node bin/decree.js verify .
node bin/decree.js mcp decree.contract.json
```

Review the contract: init is a starting allowlist, not a legal opinion. Trim tokens/components before locking CI.
