# Decree examples — third-party proof only

Isolated mini-apps used to prove Decree against **established foreign design systems**.

## Policy

- **In scope:** shadcn-shaped stacks, MUI, Radix Themes, Chakra, etc.  
- **Out of scope:** Corvy, stevendeeds.com, `@stevendeeds/sd33ds` production, any personal production app  

## Layout

| Path | System | Role |
|------|--------|------|
| `../fixtures/shadcn-*` | shadcn/ui-shaped | Golden clean/dirty (no npm install) |
| `../fixtures/mui-*` | MUI-shaped | Golden clean/dirty (no npm install) |
| `radix-themes-*` | Radix Themes-shaped | Lightweight fixtures |
| `mui-from-npm/` | Real `@mui/material` | `npm install` + `decree init` + clean/dirty apps |
| `radix-from-npm/` | Real `@radix-ui/themes` | `npm install` + `decree init` + clean/dirty apps |
| `trials/` | Public third-party apps | External pressure tests — see [docs/TRIALS.md](../docs/TRIALS.md) |

## Commands

```bash
# From decree repo root
npm run examples:install   # install foreign packages into example folders
npm run examples:init      # refresh init.full.contract.json dumps
npm run examples:verify    # clean must pass; dirty must fail
```

See [docs/GETTING_STARTED.md](../docs/GETTING_STARTED.md).
