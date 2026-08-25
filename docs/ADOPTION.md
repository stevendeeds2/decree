# Adopting Decree on a brownfield app

Absolute `decree verify` is correct for greenfield and for the MUI flagship demo. Real apps often start with hundreds of findings. Use the **ratchet**.

## Day 1

```bash
# 1) Prefer: copy curated contract from the DS package
npx decree use @your/ds --force

# Or bootstrap (DS authors): decree prepare with decree.sources.json — see SOURCES.md
# Legacy: npx decree init ./node_modules/@your/ds --force   # noisy without sources

# 2) Tune scan (typical consumer app)
# In decree.contract.json:
#   "scan": { "profile": "app", "localComponentPrefixes": ["src/components"] }

# 3) Snapshot current debt
npx decree verify . --write-baseline decree.baseline.json
# exit 0 — writes the baseline even when findings exist
```

Commit `decree.contract.json` + `decree.baseline.json`.

## CI (ongoing)

```bash
npx decree verify . --baseline decree.baseline.json
```

Example workflow: [`.github/examples/decree-verify.yml`](../.github/examples/decree-verify.yml). Install notes: [INSTALL.md](./INSTALL.md).

- **Pass** if there are **0 new** findings (debt already in the baseline is ignored).
- **Fail** if someone introduces a new forgery / hex / unknown component.
- Deprecated contract components and tokens also fail verify (`DECREE_DEPRECATED_COMPONENT` / `DECREE_DEPRECATED_TOKEN`). Existing usage can be ratcheted with a baseline.

Optional budget:

```bash
npx decree verify . --baseline decree.baseline.json --max-new 5
```

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
