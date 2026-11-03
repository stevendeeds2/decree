# Adopting Decree on a brownfield app

Absolute `decree verify` is correct for greenfield and for the MUI flagship demo. Real apps often start with hundreds of findings. Use the **ratchet**.

## Day 1

```bash
# 1) Point this app at the installed design system.
#    decree.contract.json names the package and records scan.
#    The allowlist stays in the package.
npx decree setup @your/ds

# Or, if the package is already a dependency that ships a contract:
npx decree setup

# Design-system authors build that contract with decree prepare (SOURCES.md)
# or from Specs 2 / DS Contracts files (ADAPTERS.md).

# 2) Tune scan if setup guessed wrong (typical consumer app)
# In the app's decree.contract.json:
#   "designSystem": "@your/ds",
#   "scan": { "profile": "app", "localComponentPrefixes": ["src/components"] }

# 3) Snapshot current debt
npx decree verify . --write-baseline decree.baseline.json
# exit 0 — writes the baseline even when findings exist
```

Commit `decree.contract.json` + `decree.baseline.json`.

The allowlist (components, tokens, props, deprecations, restyle) belongs to the design-system package. `scan` belongs to the app. `decree.baseline.json` belongs to the app: it is a temporary record of debt, not a second contract.

Apps that already committed a full copy of `decree.contract.json` keep working. That copy is the old path. `decree use` still refreshes it. `decree setup` replaces it with a pointer and keeps `scan`.

## CI (ongoing)

```bash
npx decree verify . --baseline decree.baseline.json
```

Example workflow: [`.github/examples/decree-verify.yml`](../.github/examples/decree-verify.yml). Install notes: [INSTALL.md](./INSTALL.md).

- **Pass** if there are **0 new** findings (debt already in the baseline is ignored).
- **Fail** if someone introduces a new invented component, hardcoded color, or unknown token.
- Deprecated contract components and tokens also fail verify (`DECREE_DEPRECATED_COMPONENT` / `DECREE_DEPRECATED_TOKEN`). Existing usage can be ratcheted with a baseline.
- If the contract includes `componentApis`, unknown props and illegal static values also fail (`DECREE_UNKNOWN_PROP` / `DECREE_INVALID_PROP_VALUE` / `DECREE_INVALID_PROP_COMBO`). Ratchet leftover usage with a baseline.
- If the contract includes `restyle`, `style=` / `sx=` / paint-or-size arbitrary class on system primitives also fail (`DECREE_RESTYLE_STYLE` / `DECREE_RESTYLE_SX` / `DECREE_RESTYLE_ARBITRARY_CLASS`). Layout utilities are allowed. Leave `restyle` off for MUI-style `sx` codebases until you are ready.

Optional budget:

```bash
npx decree verify . --baseline decree.baseline.json --max-new 5
```

## Picking up a new design-system release

Upgrade the design-system dependency. Verify then reads the contract that version ships. The app's `scan` and baseline stay as they are.

Apps still on a copied contract can refresh the copy:

```bash
npx decree use @your/ds --check   # fails if this app's copy is behind the package
npx decree use @your/ds           # updates the copy and keeps this app's scan settings
```

That check is for the old copied file. It is not how a pointer stays honest. The pin is the package version in the lockfile.

Baselines match findings by code, file, and the thing found (a color, a name, a prop value), not by message wording. Baselines written before that change need one `--write-baseline` run after upgrading.

## Burning down debt

1. Fix a batch of issues in the app.  
2. Refresh the baseline: `decree verify . --write-baseline decree.baseline.json`  
3. Repeat until the baseline is empty (or small), then consider absolute mode.

Baseline is a **temporary on-ramp**, not permanent permission to invent UI.

## Modes cheat sheet

| Command | Behavior |
|---------|----------|
| `decree verify .` | Absolute — any finding fails |
| `--write-baseline file` | Snapshot findings; always exit 0 on success |
| `--baseline file` | Fail only on findings not in the baseline |
| `--max-new N` | Fail if new count > N |

## Demo

Case studies live under [`demos/`](../demos/) (Pulse Reports today). Use baseline for brownfield CI on your own apps.

This exact flow was piloted on a real open-source app — see [demos/PILOT-taxonomy.md](../demos/PILOT-taxonomy.md): 83 findings baselined on day 1, an injected violation caught with exit 1.
