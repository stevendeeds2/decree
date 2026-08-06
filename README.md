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

POC slices **A (verify)** and **B (MCP allowlist)** plus **`decree init`** are on the product path. Proof target: **third-party design systems** via isolated fixtures / `examples/` — not personal production apps.

Corvy project: **DECREE** (board only).

### Hard rule

Do **not** dogfood on Corvy, stevendeeds.com, or SD33DS production. Prove Decree on established foreign systems first.

External trial results: [docs/TRIALS.md](./docs/TRIALS.md) (`npm run trials`).  
Pressure gate before outside invites: [docs/PRESSURE.md](./docs/PRESSURE.md) (`npm run pressure`).  
Brownfield adoption (baseline ratchet): [docs/ADOPTION.md](./docs/ADOPTION.md).

## Get started

Full walkthrough: [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)

```bash
npm install
npm run demo                 # clean pass / dirty fail across 3rd-party fixtures + npm examples

# Or bootstrap a contract from an installed foreign package:
npm run examples:install
node bin/decree.js init examples/mui-from-npm/node_modules/@mui/material --force
node bin/decree.js verify examples/mui-from-npm/clean
```

## Roadmap (full story)

1. **Done — Verify** — contract + CI against shadcn clean/dirty fixtures  
2. **Done — MCP** — agent allowlist (`list_primitives`, `list_tokens`, `validate_snippet`)  
3. **Done — Init** — bootstrap contract from a design-system package  
4. **Done — 3rd-party fixtures** — MUI clean/dirty (same Decree codes)  
5. **Now — Examples** — isolated test apps for shadcn / MUI / Radix Themes  
6. **Later — Docs / measurement** — generated from the same contract  

### Proof matrix (3rd-party only)

| System | Clean | Dirty |
|--------|-------|-------|
| shadcn/ui | `fixtures/shadcn-clean` | `fixtures/shadcn-dirty` |
| MUI | `fixtures/mui-clean` | `fixtures/mui-dirty` |
| Radix Themes | `examples/radix-themes-clean` | `examples/radix-themes-dirty` |
| init sample | `fixtures/init-sample-pkg` | — |

## Package name

npm unscoped `decree` is taken. This project ships as **`@stevendeeds/decree`**.

## Quick links

- [Getting started](./docs/GETTING_STARTED.md)
- [Thesis](./docs/THESIS.md)
- [POC plan](./docs/POC.md)
- [Init](./docs/INIT.md) — bootstrap contract from a package
- [Examples](./examples/README.md) — third-party proof apps
- [AGENTS.md](./AGENTS.md) — context for ongoing agent work
