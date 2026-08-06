# AST + positive tokens Implementation Plan

> **For agentic workers:** Use TDD. Checkbox steps.

**Goal:** Babel AST for JSX/native; `DECREE_UNKNOWN_TOKEN` for unknown `var(--*)` when contract has tokens.

**Architecture:** `src/verify/ast-scan.js` parses + walks; `scanSource` merges AST findings with color/arbitrary regex; `src/verify/tokens.js` for var() extraction.

**Tech:** `@babel/parser`, Node 20+, existing `node:test`.

---

### Task 1: Deps + failing tests

- [x] Add `@babel/parser`
- [x] Write `tests/ast-scan.test.js` + `tests/tokens-positive.test.js`
- [x] Confirm RED

### Task 2: Implement + wire

- [x] Implement ast-scan + tokens helpers
- [x] Wire `scanSource`; add `UNKNOWN_TOKEN` code
- [x] GREEN all tests; `npm run pressure`
- [ ] Commit / PR
