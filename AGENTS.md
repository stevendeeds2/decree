# AGENTS.md — Decree

Context for Cursor / Claude Code / Codex working in this repo.

## What Decree is

Enforcement layer for design systems: **contracts + CI verify + agent allowlists**.

Not a design tool. Not a docs CMS. Not soft AI context.

Pitch: *If it’s not in the system, it doesn’t ship.*

## Source of truth for product intent

1. `docs/THESIS.md` — why we exist  
2. `docs/POC.md` — what we’re proving first (**slice A locked: verify-first**)  
3. `README.md` — pitch + user story + full roadmap  
4. Corvy project **DECREE** — board / issues  

## Sequencing (do not shrink the story)

- **Done:** contract + `decree verify` + shadcn fixtures  
- **Done:** MCP allowlist (`src/mcp/`, `bin/decree-mcp.js`)  
- **Done:** MUI fixtures (3rd-party)  
- **Done:** `decree init` — bootstrap contract from a package (`src/init/`)  
- **Done:** isolated **3rd-party** fixtures + npm-backed examples (MUI, Radix Themes)  
- **Done:** richer scanners — unknown components, rgb/hsl colors  
- **Done:** external trials (MUI / Radix / shadcn) + import-aware allowlisting (same-file package aliases)  
- **Next:** contract profiles (strict vs app-local shells)  
- **Later:** docs-from-contract, measurement, deeper AST scanners  

Do not delete roadmap items from docs to “simplify.” Same scanners power CI (`verify`) and MCP (`validate_snippet`). Get-started path: **init → verify → mcp**.

## Hard rule — production off-limits (2026-08-04)

**Do not** change, dogfood, or “prove” Decree on personal production surfaces:

- Corvy  
- stevendeeds.com  
- `@stevendeeds/sd33ds` production consumers  
- Any other Steven production app  

Proof of value = **third-party established design systems** via fixtures / `examples/` test apps **inside this repo only**.

SD33DS fixtures (if present) are historical/internal only — **not** the product proof narrative.

## Rules for agents in this repo

1. Do not invent product scope outside thesis/POC without updating those docs.  
2. Prefer failing tests that prove enforcement over marketing demos.  
3. npm package name is `@stevendeeds/decree` (unscoped `decree` is taken).  
4. Keep fixtures small and deterministic.  
5. Stable error codes for verify failures — never silent pass on dirty UI.  
6. When work is done, leave Corvy **DECREE** issue comments with what changed and what’s next.  
7. TDD: failing test first for verify/contract behavior.  
8. Never open PRs against Corvy / SDCOM / SD33DS for Decree dogfood.

## Corvy board

- Workspace: Default  
- Project key: **DECREE** (product board only — not the Corvy app)  
- Use DECREE issues for ongoing context across sessions.
