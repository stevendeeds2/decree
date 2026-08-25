# Pilot: Decree on a real app (shadcn/taxonomy)

[Taxonomy](https://github.com/shadcn-ui/taxonomy) is shadcn's own open-source Next.js app — a real codebase, not a demo built for Decree. This pilot ran the documented adoption flow against it unmodified.

Result: **Decree found real drift.** Taxonomy ships a `Button` component and still renders raw `<button>` elements in seven files. The baseline ratchet then held: existing debt ignored, one injected violation caught.

## What was run

```bash
git clone --depth 1 https://github.com/shadcn-ui/taxonomy /tmp/pilot/taxonomy
cd /tmp/pilot/taxonomy

# 1. Sources: the app's own components/ui and globals.css
#    (decree.sources.json: include components/ui, css-allowlist styles/globals.css,
#     nativeElementMap for button/input/textarea/select, shadcn Button API)
decree prepare .
# → wrote decree.contract.json (153 components, 20 tokens)

# 2. Tune scan for an app (per docs/ADOPTION.md)
#    "scan": { "profile": "app", "localComponentPrefixes": ["components", "app"] }

# 3. Snapshot debt, then ratchet
decree verify . --write-baseline decree.baseline.json   # 83 findings snapshotted, exit 0
decree verify . --baseline decree.baseline.json          # ok — 0 new, 83 baselined
```

## What Decree found (day 1, after scan tuning)

| Code | Count | Example |
|------|-------|---------|
| `DECREE_ARBITRARY_VALUE` | 44 | Tailwind arbitrary values off the token system |
| `DECREE_HARDCODED_COLOR` | 19 | `hsl(...)` literals in `tailwind.config.js` |
| `DECREE_NATIVE_ELEMENT` | 7 | Raw `<button>` in `billing-form.tsx`, `main-nav.tsx`, `user-auth-form.tsx`, … despite a shipped `<Button>` |
| `DECREE_UNKNOWN_TOKEN` | 6 | `--font-sans`, `--radix-accordion-content-height` |
| `DECREE_HARDCODED_HEX` | 4 | Hex literals |
| `DECREE_UNKNOWN_COMPONENT` | 3 | Third-party wrappers (`VercelAnalytics`, `TextareaAutosize`, `NextThemesProvider`) — contract-tuning candidates, not forgeries |

Before scan tuning the absolute run reported 192 findings — the documented `scan.profile: "app"` + `localComponentPrefixes` step cut the app-local component noise (112 → 3), exactly the brownfield path in [docs/ADOPTION.md](../docs/ADOPTION.md).

## The ratchet held

With the baseline committed, a new violation was injected:

```tsx
// components/promo-banner.tsx
export function Promo() {
  return <MagicButton style={{ background: "#ff0000" }}>Buy</MagicButton>;
}
```

```
DECREE_HARDCODED_HEX      components/promo-banner.tsx:2  Hardcoded color #ff0000 — use a contract token instead
DECREE_UNKNOWN_COMPONENT  components/promo-banner.tsx:2  Unknown component <MagicButton> — not in the Decree contract allowlist
decree verify: 2 new, 83 baselined, 85 total
decree verify: failed with 2 new finding(s)   # exit 1
```

Zero false movement on the 83 baselined findings; exactly the two new ones failed the run.

## Honest notes

- Taxonomy's code is not vendored here — the pilot is reproducible with the commands above.
- The 44 arbitrary-value and 19 hardcoded-color findings are real but expected in Tailwind apps; a team would ratchet them, not fix them on day 1.
- The three unknown components are legitimate third-party wrappers a team would add to the contract or `localComponentPrefixes` — Decree makes that an explicit decision instead of silent drift.
