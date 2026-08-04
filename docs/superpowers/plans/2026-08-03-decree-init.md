# Decree Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `decree init` that builds a valid v1 contract from a design-system package.

**Architecture:** `src/init/` resolves a package root, extracts components (exports + export regex) and tokens (CSS + tokens.json), applies nativeElementMap heuristics, writes JSON. CLI wires through `bin/decree.js`.

**Tech Stack:** Node 20+, `node:test`, existing `validateContract`.

---

## File map

| File | Role |
|------|------|
| `src/init/resolve.js` | Resolve path or package name → package root |
| `src/init/extract.js` | Components + tokens + nativeElementMap |
| `src/init/index.js` | `buildContractFromPackage`, `writeContract` |
| `bin/decree.js` | `init` command |
| `fixtures/init-sample-pkg/**` | Deterministic fake DS |
| `tests/init.test.js` | TDD coverage |
| docs/README/AGENTS/POC | Surface the command |

## Tasks

- [ ] Sample package fixture
- [ ] RED: init tests (build + write + force)
- [ ] GREEN: implement `src/init/*` + CLI
- [ ] Docs + Corvy issue
- [ ] Commit / push
