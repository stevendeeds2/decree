# Import-aware allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve same-file package import aliases so JSX tags that rename allowlisted DS exports do not fail `DECREE_UNKNOWN_COMPONENT`.

**Architecture:** Add `collectImportAliases(source)` in `src/verify/imports.js`. `scanSource` consults the map before emitting unknown-component findings. No contract schema changes; no module graph.

**Tech Stack:** Node 20+, existing `node:test` suite, regex-based scanners (match current verify style).

---

### Task 1: Failing tests for import aliases

**Files:**
- Create: `tests/imports-allowlist.test.js`
- (Later) Create: `src/verify/imports.js`
- Modify: `src/verify/scan.js`

- [ ] **Step 1: Write failing tests** covering default alias, named alias, still-unknown, relative import ignored
- [ ] **Step 2: Run tests — expect FAIL**
- [ ] **Step 3: Implement `collectImportAliases` + wire into `scanSource`**
- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

### Task 2: Docs + MUI trial smoke

**Files:**
- Modify: `docs/TRIALS.md` and/or `README.md` (brief mention)
- Run: `npm run trials` (or at least MUI trial path)

- [ ] **Step 1: Re-verify MUI trial; note delta in unknown count**
- [ ] **Step 2: Update curated narrative if numbers change**
- [ ] **Step 3: Commit, push, open PR**
