# Contract profiles (v1)

**Status:** approved (proceed after import-aware allowlisting)  
**Date:** 2026-08-04  
**Goal:** Distinguish “DS primitives only” from “DS + app-local composites” so flagship trials aren’t drowned in local shells (`ProTip`, `Copyright`, …).

## Problem

After import-aware allowlisting, the MUI official example still fails on **app-local** components that are not (and should not be) on the `@mui/material` allowlist. Treating those as forgeries is wrong for consumer apps; ignoring all unknown PascalCase is too loose.

## Profiles

| Profile | Behavior |
|---------|----------|
| **`strict`** *(default)* | Current behavior: JSX tag must be framework host, contract component, or package-import alias → contract export. |
| **`app`** | `strict` **plus** tags whose names are discovered as **local components** under configured prefixes. |

## Config (on contract)

```json
{
  "scan": {
    "profile": "app",
    "localComponentPrefixes": ["src/components"],
    "excludePrefixes": ["src/components/ui"]
  }
}
```

- `profile` — `"strict"` | `"app"`; omit → `"strict"`.
- `localComponentPrefixes` — only used when `profile === "app"`; default `["src/components"]`.
- Existing `excludePrefixes` still skips scanning those paths; discovery also skips them (and a `ui/` segment under a local prefix).

## Local component discovery

Walk files under each local prefix (tsx/jsx/ts/js, non-test). Collect PascalCase names from:

1. **Basename** — `ProTip.tsx` → `ProTip`
2. **Declarations in those files** — `function LightBulbIcon`, `export function X`, `const X =`, `export const X =` (PascalCase only)

No module graph. Relative imports outside prefixes do not grant allowlisting unless the name was discovered under a local prefix file.

## Scanner

`scanSource(..., { localComponents?: Set<string> })`  
Unknown-component check also passes when `localComponents.has(name)`.

`verifyPath` builds the set when profile is `app`, then passes it into each `scanSource` call.

Color / native / arbitrary scanners unchanged (theme hex still fails — correct).

## Success

- Unit tests: strict still flags local shells; app allows discovered locals; invented names still fail.
- MUI trial with `profile: "app"` → unknown shells cleared; only residual non-component findings (e.g. theme hex).

## Non-goals

- Allowing arbitrary PascalCase anywhere in `src/`
- Following `@/` re-exports outside local prefixes
- New contract `version`
