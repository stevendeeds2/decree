# Decree sources (`decree.sources.json`)

`decree.sources.json` tells `decree prepare` where your components and tokens live, so the contract lists only what you meant to publish.

## Why

Without it, Decree walks the whole package and picks up everything that looks like a component or a CSS variable, including helpers you never meant to publish.

Design-system teams should:

1. `decree sources` — scaffold `decree.sources.json` (every option key, empty values)  
2. Fill `components.include` + token paths  
3. Run `decree prepare` on every release  
4. Ship `decree.contract.json` inside the package  
5. Let apps `decree use @acme/ds` — copy the curated contract  

The contract is a **governance backend artifact**, updated at the tail of a DS change.

## Scaffold

```bash
# From the design-system package root (or pass the path)
decree sources
decree sources ./packages/ui --force   # overwrite
```

Writes every schema key so you fill a form instead of inventing a format:

```json
{
  "version": 1,
  "components": {
    "include": [],
    "exclude": []
  },
  "tokens": {
    "mode": "css-allowlist",
    "files": [],
    "cssAllowlist": [],
    "modes": []
  },
  "ignoreComponentNames": [],
  "nativeElementMap": {},
  "deprecations": {
    "components": {},
    "tokens": {}
  },
  "componentApis": {},
  "restyle": {
    "style": false,
    "sx": false,
    "arbitraryClass": false
  }
}
```

### Fields

| Key | Purpose |
|-----|---------|
| `components.include` | Dirs/files that own public components (required for a useful prepare) |
| `components.exclude` | Globs to skip (stories, tests, …) |
| `tokens.mode` | Where `decree prepare` looks for token names. One of `dtcg-only`, `css-allowlist`, `legacy-scan`. Not the same thing as `tokens.modes` |
| `tokens.files` | DTCG / JSON token files (with `dtcg-only` or alongside CSS) |
| `tokens.cssAllowlist` | CSS files whose `--*` vars become contract tokens |
| `tokens.modes` | Optional. Path segments that choose a theme, such as `["light", "dark"]`. Prepare also allowlists each path with those segments removed. See [Theme modes in a DTCG path](#theme-modes-in-a-dtcg-path) |
| `ignoreComponentNames` | Drop accidental exports (`App`, `ThemeProvider`, …) |
| `nativeElementMap` | Map native tags → allowlisted components (`"a": "Button"`) |
| `deprecations` | Notices for still-allowlisted components/tokens (`replacement`, `reason`, `since`, `removeAfter`) |
| `componentApis` | Optional prop/enum map copied onto the contract (`props`, `forbiddenCombinations`). Missing key = no prop enforcement |
| `restyle` | Optional. `true` or `{ style, sx, arbitraryClass }` copied when any flag is on. Missing = no restyle enforcement |

### Where prepare reads tokens

`tokens.mode` chooses the files `decree prepare` reads. It does not name light and dark.

| `tokens.mode` | Behavior |
|------|----------|
| `dtcg-only` | Only the JSON token files in `tokens.files` — **recommended** when you have DTCG. If `files` is empty, prepare reads `tokens.json` at the package root |
| `css-allowlist` | Every `--name` in the CSS files in `cssAllowlist`, including names that only appear inside `var()`. Optional JSON files in `tokens.files` are read too. This is the scaffold default |
| `legacy-scan` | Walks all CSS in the package, plus `tokens.json`. Noisy; an escape hatch |

### Theme modes in a DTCG path

`tokens.modes` is a different setting. It is optional, and it only matters while `decree prepare` is reading a DTCG JSON file. `decree verify` and MCP do not read `tokens.json` or this list. They check the names already written into `decree.contract.json`. If `modes` was empty at prepare time, an app that uses the mode-less name fails later, even when the design system's own CSS uses that name.

Use it when a path segment means "this is the light or dark copy," and the public CSS name drops that segment. Leave it empty when your CSS really does reference `--theme-light-*` and `--theme-dark-*` directly and never a shared alias.

A DTCG file shaped like this:

```json
{
  "theme": {
    "light": { "surface": { "passive": { "background-color": { "$value": "#ffffff" } } } },
    "dark": { "surface": { "passive": { "background-color": { "$value": "#111111" } } } }
  }
}
```

with `"modes": ["light", "dark"]` produces both `--theme-light-surface-passive-background-color` and `--theme-surface-passive-background-color`. The contract does not store `#ffffff` or `#111111`.

One path, from `tokens.json` to the names in the contract:

1. `tokens.mode` is `dtcg-only`, and `tokens.files` lists the DTCG file.
2. Each DTCG path becomes a CSS name by turning dots into dashes. `theme.light.surface.passive.background-color` becomes `--theme-light-surface-passive-background-color`.
3. `tokens.modes` lists the segments that choose the theme, not a separate token. `["light", "dark"]` also allowlists the path with those segments removed: `--theme-surface-passive-background-color`. The light path and the dark path both produce that same name. The contract stores names, not colors. The design system's emitter still supplies the values.
4. `decree prepare` writes both names into `decree.contract.json`.
5. The mode-less name usually should not be added to `tokens.json`. It is not a third color. It is the public CSS name for whichever mode is active.

The strip drops every path segment whose name is in the list, anywhere in the path, not only the child of `theme`. In a file where `light` and `dark` exist only under `theme`, that is the result you want. A group that is actually named `light` — a primitive, not a theme — would be shortened too. Name only the segments that mean "this chooses the theme."

`tokens.modes` is not read from CSS. `css-allowlist` and the CSS half of `legacy-scan` copy the `--*` names as they are written.

## Filled example

This design system keeps light and dark in the DTCG path and publishes a mode-less CSS name. `tokens.modes` is what adds that name. A system that only ever uses the full `--theme-light-*` names would set `"modes": []`.

```json
{
  "version": 1,
  "components": {
    "include": ["src/components/ui"],
    "exclude": ["**/*.stories.*", "**/*.test.*"]
  },
  "tokens": {
    "mode": "dtcg-only",
    "files": ["tokens.json"],
    "modes": ["light", "dark"]
  },
  "ignoreComponentNames": ["App", "Page", "Layout"],
  "nativeElementMap": {
    "button": "Button",
    "input": "Input",
    "a": "Button"
  },
  "deprecations": {
    "components": {
      "LegacyButton": {
        "replacement": "Button",
        "reason": "Merged into Button",
        "since": "2026-08-01",
        "removeAfter": "2026-12-01"
      }
    },
    "tokens": {
      "--brand-blue": {
        "replacement": "--primary",
        "reason": "Renamed to semantic token",
        "since": "2026-08-01"
      }
    }
  },
  "componentApis": {
    "Button": {
      "props": {
        "variant": { "enum": ["primary", "secondary"] },
        "size": { "enum": ["sm", "md", "lg"] },
        "disabled": { "type": "boolean" }
      }
    }
  }
}
```

## Commands

```bash
# DS package root
decree sources                 # scaffold sources (once)
decree prepare                 # write decree.contract.json from sources
decree prepare --check         # fail if committed contract drifted
decree prepare --from-specs <dir>            # build the contract from Specs 2 files
decree prepare --from-ds-contracts <dir>     # build the contract from DS Contracts files

# still supported
decree init ./packages/ds --force
# warns if no decree.sources.json

# consumer app
decree use @acme/ds --force    # copy published contract → ./decree.contract.json
decree verify .
```

Point `package.json` at the shipped contract:

```json
{
  "name": "@acme/ds",
  "files": ["dist", "decree.contract.json", "decree.sources.json"],
  "decree": "./decree.contract.json"
}
```

Suggested `prepublishOnly`: `decree prepare && decree prepare --check`

## Legacy

No `decree.sources.json` → full scan + stderr warning pointing here. Run `decree sources` first.
