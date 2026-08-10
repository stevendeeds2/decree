# AGENTS.md — Decree

Context for agents working in this repo.

## What Decree is

Enforcement layer for design systems: **contracts + CI verify + agent allowlists**.

Pitch: *If it’s not in the system, it doesn’t ship.*

## Layout

| Path | Role |
|------|------|
| `bin/`, `src/` | Product |
| `docs/` | User docs that ship with the package |
| `demos/` | Case studies by design system — start at `demos/index.html` (shadcn / mui / antd) |
| `tests/` | Unit tests; small packages under `tests/support/` |

## Rules

1. Prefer the smallest correct change; don’t revive deleted fixtures/examples/trials.
2. Proof for demos = third-party-shaped systems under `demos/` — not Corvy / stevendeeds.com / SD33DS production.
3. Package name: `@stevendeeds/decree`.
4. Stable error codes on verify failures — never silent pass on dirty UI.
5. Corvy project **DECREE** for board context.

## Hard rule — production off-limits

Do **not** dogfood Decree on Corvy, stevendeeds.com, or `@stevendeeds/sd33ds` production consumers.
