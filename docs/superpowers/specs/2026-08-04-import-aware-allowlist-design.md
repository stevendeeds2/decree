# Import-aware allowlisting (v1)

**Status:** approved (scope B)  
**Date:** 2026-08-04  
**Goal:** Stop false `DECREE_UNKNOWN_COMPONENT` hits when a file imports an allowlisted DS export under a different local name.

## Problem

`decree verify` allowlists by JSX tag name only. Real apps rename imports:

```tsx
import MaterialUILink from '@mui/material/Link';
// …
<MaterialUILink href="/about" />
```

`MaterialUILink` is not in the contract; `Link` is. Today this is a false positive. The official MUI Next.js example does exactly this.

## Scope (v1) — same-file DS package imports

**In:**

1. Default imports from package paths whose last segment is a PascalCase export name  
   `import MaterialUILink from '@mui/material/Link'` → local `MaterialUILink` ≡ `Link`
2. Named imports / aliases from packages  
   `import { Link as MaterialUILink } from '@mui/material'` → same  
   `import { Button } from '@mui/material'` → identity (no behavior change if already allowlisted)

**Out (later):**

- Following local re-exports (`@/components/Link`, `./Link`)
- Namespace imports (`import * as Mui from '@mui/material'`)
- Full TypeScript program / module graph
- Contract-level manual alias tables (unnecessary if imports resolve)

## Approaches considered

| Approach | Trade-off |
|----------|-----------|
| **A. Same-file default imports only** | Too narrow — misses `{ Link as X }` |
| **B. Same-file default + named aliases from packages** *(chosen)* | Covers MUI example; stays regex-cheap; no graph |
| **C. Project-wide resolution** | Correct for wrappers; needs module graph; defer |

## Design

### New unit: `src/verify/imports.js`

`collectImportAliases(source) → Map<string, string>`  
Maps **local binding → export/component name**.

Rules:

- Only consider `from '…'` / `from "…"` whose module specifier does **not** start with `.` or `/` and is not a bare path-alias that starts with `@/` (treat `@/` as local — skip). Scoped packages like `@mui/…` **are** considered.
- Default: `import Local from 'pkg/ExportName'` → if last path segment matches `^[A-Z][A-Za-z0-9]*$`, map `Local → ExportName`.
- Named: `import { Export as Local }` / `import { Export }` → map `Local → Export` (identity when no `as`).
- Multi-name imports supported on one line; ignore `type` imports (`import type`, `import { type X }`).
- First binding wins if duplicates (stable, rare).

### Scanner change: `src/verify/scan.js`

Before unknown-component checks, build `aliases = collectImportAliases(source)`.

A JSX tag `name` is allowed if:

1. `FRAMEWORK_COMPONENTS.has(name)`, or  
2. `allow.has(name)`, or  
3. `aliases.has(name) && allow.has(aliases.get(name))`

Finding message can note resolution when (3) would have failed without it — optional; v1 may keep the same message shape for non-allowed only.

### MCP

`validate_snippet` already uses `scanSource` — inherits behavior.  
`isAllowedPrimitive(name)` stays literal-name (agent asks about contract names, not file-local aliases).

### Success criteria

- Unit tests: default alias + named alias allowed when target is on contract; truly unknown still fails; relative/`@/` imports do **not** grant allowlist via this path.
- Re-run MUI trial: `MaterialUILink` / similar package aliases drop from unknown count (local shells like `ProTip` still flag).

## Non-goals

- No new contract schema fields for v1.
- No AST parser dependency yet.
