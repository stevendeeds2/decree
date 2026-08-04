# Contract profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `scan.profile` (`strict` | `app`) so app-local components under configured prefixes are allowed without polluting the DS allowlist.

**Architecture:** Discover local PascalCase names from files under `localComponentPrefixes`; pass a `Set` into `scanSource`. Default remains `strict`.

**Tech Stack:** Node 20+, `node:test`, existing verify pipeline.

---

### Task 1: Discovery + scanner wiring (TDD)

- [x] Failing tests for local discovery + strict vs app scan behavior
- [x] Implement `src/verify/local-components.js` + wire `verifyPath` / `scanSource`
- [x] Validate `scan.profile` values in contract loader
- [x] Commit

### Task 2: MUI trial + docs + PR

- [x] Set MUI trial contract to `profile: "app"`
- [x] Update TRIALS.md / AGENTS.md
- [x] Push PR (#7)
