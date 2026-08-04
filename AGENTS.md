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
- **Done:** SD33DS + MUI dogfood fixtures  
- **Done:** `decree init` — bootstrap contract from a package (`src/init/`)  
- **Later:** docs-from-contract, measurement, richer scanners (variant axes, CSS-in-JS hex in template literals)  

Do not delete roadmap items from docs to “simplify.” Same scanners power CI (`verify`) and MCP (`validate_snippet`). Get-started path: **init → verify → mcp**.

## Rules for agents in this repo

1. Do not invent product scope outside thesis/POC without updating those docs.  
2. Prefer failing tests that prove enforcement over marketing demos.  
3. npm package name is `@stevendeeds/decree` (unscoped `decree` is taken).  
4. Keep fixtures small and deterministic.  
5. Stable error codes for verify failures — never silent pass on dirty UI.  
6. When work is done, leave Corvy issue comments with what changed and what’s next.  
7. TDD: failing test first for verify/contract behavior.

## Corvy

- Workspace: Default  
- Project key: **DECREE**  
- Use issues for ongoing context across sessions.
