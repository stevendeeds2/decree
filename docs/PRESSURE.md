# Decree pressure report

Generated: 2026-08-06T16:26:29.075Z

## Gate: FAIL

- npm test failed

## Unit tests

- ok: false

## Fixtures

| Fixture | Expect | Actual ok | Findings | Pass |
|---------|--------|-----------|----------|------|
| shadcn-clean | true | true | 0 | true |
| shadcn-dirty | false | false | 6 | true |
| mui-clean | true | true | 0 | true |
| mui-dirty | false | false | 8 | true |
| radix-themes-clean | true | true | 0 | true |
| radix-themes-dirty | false | false | 8 | true |
| pressure-adversarial | false | false | 7 | true |

## Trials

| Trial | Findings | Codes |
|-------|----------|-------|
| mui-nextjs-ts | 1 | {"DECREE_HARDCODED_HEX":1} |
| radix-themes-playground | 598 | {"DECREE_UNKNOWN_COMPONENT":545,"DECREE_NATIVE_ELEMENT":42,"DECREE_HARDCODED_COLOR":11} |
| shadcn-dashboard-starter | 361 | {"DECREE_UNKNOWN_COMPONENT":276,"DECREE_ARBITRARY_VALUE":68,"DECREE_HARDCODED_HEX":7,"DECREE_NATIVE_ELEMENT":10} |

## Outside-tester readiness

Internal pressure gate **failed** — do not invite outside testers yet.
