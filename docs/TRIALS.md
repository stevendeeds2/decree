# External trials report

Generated: 2026-08-04 (re-run locally via `npm run trials`)

**Scope:** public third-party apps only. No Corvy / stevendeeds.com / SD33DS production.

## Executive summary

| Trial | Source | Contract | First-pass verify |
|-------|--------|----------|-------------------|
| **mui-nextjs-ts** | [MUI official Next.js TS example](https://github.com/mui/material-ui/tree/master/examples/material-ui-nextjs-ts) | 219 components | **9 → 7 → 1** (import aliases + `scan.profile: "app"`; residual theme hex) |
| **radix-themes-playground** | [Radix Themes playground](https://github.com/radix-ui/themes/tree/main/apps/playground) | 90 components, 1484 tokens | **~621 findings** (stress / kitchensink; drifts with hardening) |
| **shadcn-dashboard-starter** | [Kiranism next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | 387 components (from local `ui/`) | **~452 findings** with default/explicit `ui/` + theme excludes |

### Takeaways

1. **Decree works on real foreign apps** — `init` + `verify` ran end-to-end without touching personal production.
2. **Best signal so far: official MUI example** — with import aliases + `scan.profile: "app"`, only **one** theme hex remains. Demo-ready.
3. **Unknown-component volume dominates** on large apps — need contract modes: “primitives only” vs “allow app-local composites.”
4. **Don’t scan the design system as if it were the consumer** — shadcn ships `components/ui` inside the app; excluding that path (and theme CSS dumps) cut findings ~1151 → ~449.
5. **Import-aware allowlisting (done)** — same-file package aliases resolve to the contract export.  
5b. **Contract profiles (done)** — `scan.profile: "app"` discovers local shells under `src/components` (plus PascalCase decls); MUI trial → **1 finding**.
6. **Playgrounds / kitchensink apps are noisy by nature** — Radix playground intentionally uses raw HTML + many patterns; treat as stress test, not a buyer demo.

## Per-trial detail

### mui-nextjs-ts (strongest demo candidate)

- **Verify:** FAIL — **1 finding** (`DECREE_HARDCODED_HEX` in `src/theme.ts`)  
- **Path:** init → import aliases → `scan.profile: "app"` → single theme hex  
- **What it means:** Flagship demo: “official MUI example is one token fix from green.”

### radix-themes-playground (stress test)

- **Verify:** FAIL — 638 findings  
- **Codes:** `UNKNOWN_COMPONENT` 563 · `NATIVE_ELEMENT` 64 · `HARDCODED_COLOR` 11  
- **What it means:** Kitchen-sink / test surface. High native + unknown counts. Good for scanner endurance, poor for “look how clean Decree is” demos.

### shadcn-dashboard-starter (real-world messy)

- **Verify:** FAIL — 1151 findings first pass; **449** after `scan.excludePrefixes: ["src/components/ui", "src/styles/themes"]`  
- **Codes (after exclude):** mostly `UNKNOWN_COMPONENT` + Tailwind `ARBITRARY_VALUE` + some native/hex  
- **What it means:** Copied-component systems need “DS root vs app root” separation. Theme CSS files full of `oklch(...)` look like color bypasses unless excluded or parsed as tokens.

## Product implications (ordered)

1. ~~**Contract profiles**~~ — shipped: `scan.profile` `strict` | `app` + local component discovery.  
2. ~~**Import-aware allowlisting**~~ — shipped.  
3. ~~**Default excludes**~~ — shipped: `ui/` + `styles/themes` skipped unless `excludeDefaults: false`.  
4. **Keep MUI official example as the flagship external demo.**

## Reproduce

```bash
# Apps are vendored under examples/trials/ (sources only; node_modules gitignored)
npm run trials
# → examples/trials/_reports/ (summary.json + machine TRIALS.md)
```

This file (`docs/TRIALS.md`) is the curated narrative; the runner does not overwrite it. See `examples/trials/README.md`.
