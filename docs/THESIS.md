# Decree thesis

## Problem

Design systems fail when they are **suggestions**.

Figma, Storybook, zeroheight, Supernova MCP, and agent rule files explain what the system looks like. They do not stop humans or AI from inventing:

- a new Button that looks on-brand
- a hardcoded hex / arbitrary Tailwind spacing
- Storybook axes that don’t exist in code
- docs that rot next to the real API

The 2025–2026 market flooded **context** (“read the docs via MCP”). Buyers still need **constraint** (“fail if you invent”).

## Insight

The missing product is not another canvas, docs site, or design-to-code generator.

It is a **control plane**: one machine-readable rulebook that design tools, code, docs, and agents must obey — with a hard fail when they don’t.

## Solution

**Decree** = contracts + CI gates + agent allowlists.

1. **Contract** — tokens (DTCG-friendly) + component manifest + composition / a11y required states + deprecations  
2. **Verify** — AST/CI checks that fail on invented primitives, fake tokens, hex bypass  
3. **MCP** — agents may only list/assemble from the real allowlist; inventing Button fails  
4. **Docs (later)** — generated from the contract, never hand-maintained as a second SoT  

Figma, Storybook, and Chromatic stay. Decree sits under them as the law.

## Non-goals

- Not a design tool (Figma competitor)
- Not a DAM / Brand Kit
- Not a marketing site builder
- Not soft “AI guardrails” that only inject wiki prose
- Not bidirectional sync theater

## Competitive wedge

| Layer | Market | Decree |
|-------|--------|--------|
| Docs MCP (zeroheight, Supernova) | Crowded soft context | Sell against: context ≠ enforcement |
| Fragments / Primitiv | Closest twins; early, soft fail-open, React/Tailwind-narrow | Differentiate: open contract, hard CI, multi-source, measurement↔enforcement |
| Southleft Console MCP | Agentic Figma power | Integrate connectors; don’t be write-MCP security debt |
| Specs (Curtis) | Figma→YAML extractor | Consume contracts; add enforcement plane |

## Success criteria (POC)

Prove potency against real systems (starting with shadcn/ui-shaped stacks):

1. Invented component → **CI fail**  
2. Hardcoded color / arbitrary spacing → **CI fail**  
3. Agent MCP returns only allowlisted primitives  
4. Golden fixtures: clean app **passes**; contaminated app **fails** with stable error codes  

## Positioning

**Decree is the enforcement layer for design systems.**
