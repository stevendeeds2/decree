# Dogfood fixtures

Phase 2 proves Decree is not shadcn-only.

## SD33DS (`@stevendeeds/sd33ds`)

Personal system of record. Fixtures model **consumer apps** (htm/Preact), not the package internals (SD33DS `Button` itself renders a native `<button>` — that is the library’s job; Decree gates product code).

- Clean: `Button`, `SectionHeader`, `var(--light-…)` theme vars  
- Dirty: invented `<button>` + hex lookalike  

## MUI (`@mui/material`)

Enterprise-shaped second framework.

- Clean: `Button`, `Card`, `Typography`, MUI CSS variables  
- Dirty: native controls + Material-blue hex soup  

## Shared potency

Same CLI, same MCP allowlist shape, same stable codes across all three systems:

`DECREE_NATIVE_ELEMENT` · `DECREE_HARDCODED_HEX` · `DECREE_ARBITRARY_VALUE`
