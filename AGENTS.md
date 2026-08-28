# AGENTS.md — Decree

Context for agents working in this repo.

## What Decree is

Enforcement layer for design systems: **contracts + CI verify + agent allowlists**.

Pitch: *If it’s not in the system, it doesn’t ship.*

Spec and contract tools write what a Button **is**. Decree refuses any Button an app or agent **used that the contract did not permit**. Decree stays the judge — no anatomy/layout schema, no Figma extract, no code generation, no restyle engine.

## Layout

| Path | Role |
|------|------|
| `bin/`, `src/` | Product |
| `docs/` | User docs that ship with the package |
| `demos/` | Case studies by design system — start at `demos/index.html` (shadcn / mui / antd / together) |
| `tests/` | Unit tests; small packages under `tests/support/` |

## Rules

1. Prefer the smallest correct change; don’t revive deleted fixtures/examples/trials.
2. Proof for demos = third-party-shaped systems under `demos/` — not production consumers.
3. Package name: `@stevendeeds/decree`.
4. Stable error codes on verify failures — never silent pass on dirty UI.

## Hard rule — production off-limits

Do **not** run Decree against the maintainer’s production apps or consumers; demos and test fixtures are the only proving ground in this repo.
