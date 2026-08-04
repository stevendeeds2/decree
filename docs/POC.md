# Decree POC plan

## Decision (locked)

**Slice A — Verify-first (shadcn A/B).**

We prove potency with contracts + CI gates first. We are **not** shrinking the product: MCP allowlists, docs-from-contract, multi-framework fixtures, and SD33DS dogfood stay in the full story — sequenced after the verify wedge is green.

| Slice | Status |
|-------|--------|
| A. Contract + `decree verify` + shadcn clean/dirty | **Done** |
| B. Decree MCP allowlist (anti-forgery) | **Done** |
| C. Demo narrative (dirty PR → fail → fix) | Ready (verify + validate_snippet) |
| D. Phase 2 frameworks + SD33DS dogfood | **Done** |

## Full product story (do not lose)

Decree’s end state remains:

1. **Contract** — tokens + component manifest + composition / a11y required states + deprecations  
2. **Verify** — CI fails on invented primitives, fake tokens, hex bypass  
3. **MCP** — agents may only assemble from the allowlist  
4. **Docs (later)** — generated from the contract  
5. **Measurement (later)** — adoption/drift tied to the same gates  

Soft context tools explain. Decree enforces. Slice A is the first proof, not the whole product.

## Goal

Show that Decree can catch the failure modes that kill design systems when AI writes UI — against **major, real frameworks**, not toy demos.

## Primary fixture: shadcn/ui

shadcn is the default gravity well for AI UI (v0, Cursor, Claude). Proving Decree here is the highest-signal demo.

**Fixture A — clean**  
Source that only uses allowlisted shadcn-shaped components + CSS variables from the contract.

**Fixture B — contaminated**  
Same shape with planted violations:

- Hand-rolled `<button>` instead of `Button`
- `bg-[#1a1a2e]` / `p-[17px]` arbitrary values
- Invented / off-contract patterns that scanners flag

**Decree must:** pass A, fail B with stable codes (`DECREE_NATIVE_ELEMENT`, `DECREE_HARDCODED_HEX`, `DECREE_ARBITRARY_VALUE`, etc.).

## Stretch fixtures (phase 2 — full story)

| System | Why |
|--------|-----|
| **Radix Themes** / raw Radix | Primitives without shadcn cosmetics |
| **MUI** | Enterprise volume; different prop model |
| **Chakra / Park UI** | Token + component coupling patterns |
| **SD33DS (`@stevendeeds/sd33ds`)** | Dogfood — personal system of record |

Phase 2 starts after shadcn A/B is green and MCP allowlist ships.

## Architecture

```
src/contract     load + validate decree.contract.json
src/verify       scanners → findings + exit codes
src/mcp          (next) allowlist tools for agents
fixtures/shadcn-clean
fixtures/shadcn-dirty
```

CLI / MCP:

```bash
npx @stevendeeds/decree verify [path]
npx @stevendeeds/decree mcp [contract.json]   # print client config
node bin/decree-mcp.js path/to/decree.contract.json
# later: init · build · docs
```

MCP tools: `list_primitives`, `list_tokens`, `is_allowed_primitive`, `validate_snippet`

## Tests (potency gate)

1. **Contract schema unit tests** — valid/invalid manifests  
2. **Verify golden tests** — clean fixture exit 0; dirty fixture exit ≠ 0 + expected codes  
3. **MCP tool contract tests** (slice B) — `list_primitives` ⊆ allowlist  
4. **Regression** — each new scanner adds a dirty fixture file  

## Demo narrative (full story beat)

1. Show dirty PR: looks fine in the browser  
2. Run `decree verify` → fails with clear codes  
3. Show agent session: MCP only offers real `Button` / tokens *(slice B)*  
4. Fix → green  

## Out of scope for Slice A

- Hosted Cloud SaaS  
- Figma write-back  
- Full docs portal  
- Multi-brand Enterprise RBAC  
- MCP server *(tracked — not abandoned)*  
