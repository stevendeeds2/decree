# External trials report

Generated: 2026-08-04 (re-run locally via `npm run trials`)

**Scope:** public third-party apps only. No Corvy / stevendeeds.com / SD33DS production.

## Executive summary

| Trial | Source | Contract | First-pass verify |
|-------|--------|----------|-------------------|
| **mui-nextjs-ts** | [MUI official Next.js TS example](https://github.com/mui/material-ui/tree/master/examples/material-ui-nextjs-ts) | 219 components | **9 findings / 8 files** |
| **radix-themes-playground** | [Radix Themes playground](https://github.com/radix-ui/themes/tree/main/apps/playground) | 90 components, 1484 tokens | **638 findings / 103 files** |
| **shadcn-dashboard-starter** | [Kiranism next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | 387 components (from local `ui/`) | **1151 → 449 findings** after excluding `ui/` + theme CSS |

### Takeaways

1. **Decree works on real foreign apps** — `init` + `verify` ran end-to-end without touching personal production.
2. **Best signal so far: official MUI example** — nearly green; remaining hits are mostly *local app shells* (`ProTip`, `Copyright`, `ModeSwitch`) and import aliases (`MuiLink`), not wild hex soup.
3. **Unknown-component volume dominates** on large apps — need contract modes: “primitives only” vs “allow app-local composites.”
4. **Don’t scan the design system as if it were the consumer** — shadcn ships `components/ui` inside the app; excluding that path (and theme CSS dumps) cut findings ~1151 → ~449.
5. **Import aliases are a false-positive class** — `import MuiLink from '@mui/material/Link'` flags `<MuiLink>` as unknown even though it’s MUI `Link`.
6. **Playgrounds / kitchensink apps are noisy by nature** — Radix playground intentionally uses raw HTML + many patterns; treat as stress test, not a buyer demo.

## Per-trial detail

### mui-nextjs-ts (strongest demo candidate)

- **Verify:** FAIL — 9 findings  
- **Codes:** `DECREE_UNKNOWN_COMPONENT` 8 · `DECREE_HARDCODED_HEX` 1  
- **What it means:** Small official example is almost compliant once local wrappers are allowlisted or ignored. Ideal for a sales/demo narrative: “init from `@mui/material` → nine findings → fix or allowlist shells → green.”

### radix-themes-playground (stress test)

- **Verify:** FAIL — 638 findings  
- **Codes:** `UNKNOWN_COMPONENT` 563 · `NATIVE_ELEMENT` 64 · `HARDCODED_COLOR` 11  
- **What it means:** Kitchen-sink / test surface. High native + unknown counts. Good for scanner endurance, poor for “look how clean Decree is” demos.

### shadcn-dashboard-starter (real-world messy)

- **Verify:** FAIL — 1151 findings first pass; **449** after `scan.excludePrefixes: ["src/components/ui", "src/styles/themes"]`  
- **Codes (after exclude):** mostly `UNKNOWN_COMPONENT` + Tailwind `ARBITRARY_VALUE` + some native/hex  
- **What it means:** Copied-component systems need “DS root vs app root” separation. Theme CSS files full of `oklch(...)` look like color bypasses unless excluded or parsed as tokens.

## Product implications (ordered)

1. **Contract profiles** — `strict` (primitives only) vs `app` (allow local PascalCase composites under `src/components` except `ui/`).  
2. **Import-aware allowlisting** — map `MuiLink` → `@mui/material/Link` → `Link`.  
3. **Default excludes** — skip vendored DS folders + `*.theme.css` token dumps.  
4. **Keep MUI official example as the flagship external demo.**

## Reproduce

```bash
# Apps are vendored under examples/trials/ (sources only; node_modules gitignored)
npm run trials
# → examples/trials/_reports/ (summary.json + machine TRIALS.md)
```

This file (`docs/TRIALS.md`) is the curated narrative; the runner does not overwrite it. See `examples/trials/README.md`.
