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

## Out of scope

Personal production surfaces. See `AGENTS.md` hard rule (2026-08-04).
