# Decree `init`

Bootstrap a v1 `decree.contract.json` from a design-system package.

> Prefer **`decree sources`** then **`decree prepare`** with [`decree.sources.json`](./SOURCES.md) for publishable contracts.  
> Bare `init` without sources is a **legacy full scan** (noisy).

## Usage

```bash
node bin/decree.js sources [package-root] [--out decree.sources.json] [--force]
node bin/decree.js init <path-or-package-name> [--out decree.contract.json] [--force] [--sources file]
node bin/decree.js prepare [package-root] [--check] [--out decree.contract.json]
node bin/decree.js use <path-or-package-name> [--out decree.contract.json] [--force]
```

| Input | Behavior |
|-------|----------|
| `sources` | Scaffold `decree.sources.json` with every option key (empty values) |
| Directory with `package.json` | Used as package root |
| npm name (e.g. `@stevendeeds/sd33ds`) | Resolved from `node_modules` walking up from cwd |
| `--out` | Output path (default `./decree.contract.json` or `./decree.sources.json`) |
| `--force` | Overwrite existing contract / sources |
| `--sources` | Path to `decree.sources.json` (default: `<pkg>/decree.sources.json`) |
| `prepare --check` | Exit 1 if sources regenerate a different contract than on disk |


## What it extracts

With **sources** (recommended): only declared component dirs + token mode.

Without sources (legacy):

- **Components** — PascalCase modules from `exports` + package walk  
- **Tokens** — all CSS `--*` plus `tokens.json`  
- **nativeElementMap** — heuristics (`Button`→`button`, …)

## After prepare / use

```bash
node bin/decree.js verify .
node bin/decree.js mcp decree.contract.json
```

See [SOURCES.md](./SOURCES.md) and [ADOPTION.md](./ADOPTION.md).
