# Pilot re-test (AST build)

Generated: 2026-08-06T16:27:17.868Z

**Branch:** `cursor/ast-token-enforcement-f454` (PR #12)
**Unit tests:** 80/80 (concurrency=1)
**Gate:** PASS

## Pilot fixtures / examples

| Target | Expect ok | Actual | Findings | Pass |
|--------|-----------|--------|----------|------|
| shadcn-clean | true | true | 0 | true |
| shadcn-dirty | false | false | 6 | true |
| mui-clean | true | true | 0 | true |
| mui-dirty | false | false | 8 | true |
| radix-clean | true | true | 0 | true |
| radix-dirty | false | false | 8 | true |
| adversarial | false | false | 7 | true |
| mui-from-npm-clean | true | true | 0 | true |
| mui-from-npm-dirty | false | false | 7 | true |
| radix-from-npm-clean | true | true | 0 | true |
| radix-from-npm-dirty | false | false | 6 | true |

## External trial apps

| Trial | Findings | Codes |
|-------|----------|-------|
| mui-nextjs-ts | 1 | `{"DECREE_HARDCODED_HEX":1}` |
| radix-themes-playground | 598 | `{"DECREE_UNKNOWN_COMPONENT":545,"DECREE_NATIVE_ELEMENT":42,"DECREE_HARDCODED_COLOR":11}` |
| shadcn-dashboard-starter | 361 | `{"DECREE_UNKNOWN_COMPONENT":276,"DECREE_ARBITRARY_VALUE":68,"DECREE_HARDCODED_HEX":7,"DECREE_NATIVE_ELEMENT":10}` |

## Read

- Flagship MUI official example still **1× theme hex** after AST migration.
- Clean fixtures still green; dirty still fail.
- Radix playground / shadcn dashboard remain high-volume stress tests (expected).
