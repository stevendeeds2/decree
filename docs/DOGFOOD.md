# Third-party proof fixtures

Decree proves potency on **established foreign design systems** via isolated fixtures / `examples/` in this repo.

## Policy (2026-08-04)

**Out of scope:** Corvy, stevendeeds.com, SD33DS production consumers, any personal production app.

**In scope:** shadcn-shaped, MUI, Radix Themes, and similar third-party systems.

## Matrix

| System | Clean | Dirty |
|--------|-------|-------|
| shadcn/ui-shaped | `fixtures/shadcn-clean` | `fixtures/shadcn-dirty` |
| MUI (`@mui/material`) | `fixtures/mui-clean` | `fixtures/mui-dirty` |
| Radix Themes | `examples/radix-themes-clean` | `examples/radix-themes-dirty` |

## Shared potency

Same CLI, same MCP allowlist shape, same stable codes:

`DECREE_NATIVE_ELEMENT` · `DECREE_HARDCODED_HEX` · `DECREE_ARBITRARY_VALUE`
