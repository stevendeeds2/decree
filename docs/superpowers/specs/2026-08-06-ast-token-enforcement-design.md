# AST scanners + positive token enforcement (v1)

**Status:** approved (option A)  
**Date:** 2026-08-06  
**Goal:** Replace regex JSX/native scanning with Babel AST; make `contract.tokens` enforceable via `var(--token)` checks.

## Scope (v1)

**In**

1. Parse `.js/.jsx/.ts/.tsx` with `@babel/parser` (`jsx` + `typescript`, `errorRecovery: true`).
2. Walk AST for:
   - PascalCase JSX tags → `DECREE_UNKNOWN_COMPONENT` (same allow/host/local/alias rules as today)
   - lowercase JSX tags in `nativeElementMap` → `DECREE_NATIVE_ELEMENT`
3. Positive tokens: if `contract.tokens.length > 0`, flag `var(--name)` when `--name` is not on the contract → `DECREE_UNKNOWN_TOKEN`.
4. Collect `var(--*)` from:
   - String / template literals in JS(X)/TS(X) (AST)
   - `.css` files (regex line scan, unchanged style)

**Out (later)**

- Full CSS AST
- className / Tailwind AST
- Replacing hex/rgb/arbitrary with full string-literal-only AST walks (keep current regex with URL-fragment skips)
- Requiring that every color use a token (only unknown `var(--*)` for now)

## Parser fallback

If parse fails entirely, fall back to legacy regex JSX/native scanners and emit no parse error finding (fail open on syntax — CI still has other signals). Prefer `errorRecovery` so partial ASTs still yield tags.

## Empty tokens

If `tokens` is `[]` (common after `init` from MUI), **skip** positive token checks — do not flood apps with unknown CSS variables from the framework.

## Codes

| Code | When |
|------|------|
| `DECREE_UNKNOWN_TOKEN` | `var(--x)` and `--x` ∉ contract.tokens |
| existing | unchanged |

## Success

- Unit tests: AST finds `<Foo>` inside expressions; ignores `<Foo>` in strings/comments; unknown `var(--missing)`; empty tokens skip.
- Existing fixture + pressure + MUI trial still meet gate expectations (MUI = 1 hex).
