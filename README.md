# Decree

**Your design system, enforced.**

Decree is the enforcement layer for design systems. Soft tools explain the rules. Decree makes the rules binding — for humans, CI, and AI agents.

If it’s not in the system, it doesn’t ship.

## Pitch (plain language)

Your team has a design system: the official buttons, colors, and spacing everyone is supposed to use.

People still make their own. AI makes its own even faster. Docs and Figma don’t stop that. They only *explain* the rules.

Decree **enforces** the rules.

You write down what’s allowed once. Then:

- AI can only build from those parts
- Code checks fail if someone sneaks in a fake color or a home-made button
- Docs stay in sync because they come from the same rulebook

So the design system stops being a hope — and starts being the law.

## User story

**As** a design-system lead on a product team that uses Cursor and Claude to ship UI,  
**I want** every AI-generated and human-written UI change checked against our real components and tokens before it can merge,  
**so that** we stop shipping lookalike buttons and off-brand colors that quietly break the system.

## Status

POC slices **A (verify)** and **B (MCP allowlist)** plus **dogfood** and **`decree init`** are on the product path. Full story preserved — docs-from-contract and measurement are sequenced, not cut.

Corvy project: **DECREE**.

## Get started

```bash
# 1. Point at your design-system package (path or node_modules name)
node bin/decree.js init ./path/to/design-system
# → writes decree.contract.json (components + tokens + nativeElementMap)

# 2. Gate product UI
node bin/decree.js verify .

# 3. Leash agents (optional)
node bin/decree.js mcp decree.contract.json
# paste into Cursor / Claude MCP config, then call list_primitives
```

## Roadmap (full story)

1. **Done — Verify** — contract + CI against shadcn clean/dirty fixtures  
2. **Done — MCP** — agent allowlist (`list_primitives`, `list_tokens`, `validate_snippet`)  
3. **Done — Dogfood** — SD33DS + MUI clean/dirty fixtures (same Decree codes)  
4. **Done — Init** — bootstrap contract from a design-system package  
5. **Later — Docs / measurement** — generated from the same contract  

### Fixtures matrix

| System | Clean | Dirty |
|--------|-------|-------|
| shadcn/ui | `fixtures/shadcn-clean` | `fixtures/shadcn-dirty` |
| SD33DS | `fixtures/sd33ds-clean` | `fixtures/sd33ds-dirty` |
| MUI | `fixtures/mui-clean` | `fixtures/mui-dirty` |
| init sample | `fixtures/init-sample-pkg` | — |

## Package name

npm unscoped `decree` is taken. This project ships as **`@stevendeeds/decree`**.

## Quick links

- [Thesis](./docs/THESIS.md)
- [POC plan](./docs/POC.md)
- [Init](./docs/INIT.md) — bootstrap contract from a package
- [AGENTS.md](./AGENTS.md) — context for ongoing agent work
