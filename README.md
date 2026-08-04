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

Greenfield. Thesis and POC plan live in `docs/`. Corvy project: **DECREE**.

## Package name

npm unscoped `decree` is taken. This project ships as **`@stevendeeds/decree`**.

## Quick links

- [Thesis](./docs/THESIS.md)
- [POC plan](./docs/POC.md)
- [AGENTS.md](./AGENTS.md) — context for ongoing agent work
