# Decree POC plan

## Goal

Show that Decree can catch the failure modes that kill design systems when AI writes UI — against **major, real frameworks**, not toy demos.

## Primary fixture: shadcn/ui

shadcn is the default gravity well for AI UI (v0, Cursor, Claude). Proving Decree here is the highest-signal demo.

**Fixture A — clean**  
Minimal Vite/React app that only uses allowlisted shadcn components + CSS variables from the contract.

**Fixture B — contaminated**  
Same app with planted violations:

- Hand-rolled `<button className="...">` instead of `Button`
- `bg-[#1a1a2e]` / `p-[17px]` arbitrary values
- Invented `variant="super-primary"`
- Raw `div` card instead of `Card`

**Decree must:** pass A, fail B with stable codes (`DECREE_INVENTED_COMPONENT`, `DECREE_HARDCODED_TOKEN`, etc.).

## Stretch fixtures (phase 2)

| System | Why |
|--------|-----|
| **Radix Themes** / raw Radix | Primitives without shadcn cosmetics |
| **MUI** | Enterprise volume; different prop model |
| **Chakra / Park UI** | Token + component coupling patterns |
| **SD33DS (`@stevendeeds/sd33ds`)** | Dogfood — personal/system of record for Steven |

Phase 2 starts after shadcn A/B is green and documented.

## POC architecture (minimum)

```
packages/decree-core     contract schema + load/validate
packages/decree-verify   scanners → exit codes
packages/decree-mcp      allowlist tools for agents
fixtures/shadcn-clean
fixtures/shadcn-dirty
```

CLI surface (target):

```bash
npx @stevendeeds/decree init
npx @stevendeeds/decree build      # emit contract from sources
npx @stevendeeds/decree verify    # CI gate
```

## Tests (must exist before claiming potency)

1. **Contract schema unit tests** — valid/invalid manifests  
2. **Verify golden tests** — clean fixture exit 0; dirty fixture exit ≠ 0 + expected codes  
3. **MCP tool contract tests** — `list_primitives` ⊆ allowlist; no invented names returned  
4. **Regression** — each new scanner adds a dirty fixture file  

## Demo narrative (for humans)

1. Show dirty PR: looks fine in the browser  
2. Run `decree verify` → fails with clear codes  
3. Show agent session: MCP only offers real `Button` / tokens  
4. Fix → green  

## Out of scope for POC

- Hosted Cloud SaaS  
- Figma write-back  
- Full docs portal  
- Multi-brand Enterprise RBAC  

## Decision needed

See README / Corvy: choose POC approach A/B/C for first implementation slice.
