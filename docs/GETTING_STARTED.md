# Getting started with Decree

Prove Decree on **third-party design systems** using this repo’s fixtures and examples.  
Do **not** wire Decree into personal production apps (Corvy, stevendeeds.com, SD33DS consumers).

## Install (local)

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install          # Decree CLI deps
node bin/decree.js help
```

Optional: link the CLI onto your PATH while developing:

```bash
npm link             # exposes `decree` from this checkout
```

## Demo in 60 seconds

```bash
# Clean passes
node bin/decree.js verify fixtures/shadcn-clean
node bin/decree.js verify fixtures/mui-clean
node bin/decree.js verify examples/radix-themes-clean

# Dirty fails with stable codes
node bin/decree.js verify fixtures/shadcn-dirty ; echo exit:$?
```

## Real npm packages (harder trial)

```bash
# Install foreign design systems into isolated example folders
npm run examples:install

# Bootstrap contracts from installed packages (init)
npm run examples:init

# Verify clean / dirty consumer apps
npm run examples:verify
```

Playgrounds (not production apps):

| Example | Package | Clean | Dirty |
|---------|---------|-------|-------|
| `examples/mui-from-npm` | `@mui/material` | `clean/` | `dirty/` |
| `examples/radix-from-npm` | `@radix-ui/themes` | `clean/` | `dirty/` |

Each playground keeps:

- `init.full.contract.json` — raw `decree init` dump  
- `clean|dirty/decree.contract.json` — curated consumer allowlist  

## Contract profiles (`scan.profile`)

| Profile | Use when |
|---------|----------|
| `strict` *(default)* | Only DS allowlist (+ package import aliases) may appear in JSX |
| `app` | Also allow PascalCase components discovered under `scan.localComponentPrefixes` (default `src/components`; skips `ui/`) |

```json
{
  "scan": {
    "profile": "app",
    "localComponentPrefixes": ["src/components"]
  }
}
```

Flagship proof: `examples/trials/mui-nextjs-ts` with `profile: "app"` is one theme-hex finding from green.

### Default excludes

Unless `scan.excludeDefaults` is `false`, verify also skips:

- `src/components/ui`, `components/ui` (vendored shadcn-style DS)
- `src/styles/themes`, `styles/themes` (theme CSS dumps)

Custom `scan.excludePrefixes` are merged on top. See `docs/AUDIT-2026-08-04.md` for hardening backlog.

## Agent allowlist (MCP)

```bash
node bin/decree.js mcp fixtures/shadcn-clean/decree.contract.json
# paste into Cursor / Claude MCP config
```

## What “good” looks like

| Input | Result |
|-------|--------|
| Allowlisted components + tokens | `decree verify: ok` |
| Native `<button>`, hex, `rgb()`, invented `<SuperButton>` | Non-zero exit + `DECREE_*` codes |
| `var(--missing)` when contract `tokens` is non-empty | `DECREE_UNKNOWN_TOKEN` |

JSX component/native checks use a Babel AST (not regex). Hex/rgb/arbitrary remain line scanners with URL-fragment skips. Empty `tokens: []` skips positive token checks (common after `init` from MUI).

## Out of scope

Personal production surfaces. See `AGENTS.md` hard rule (2026-08-04).
