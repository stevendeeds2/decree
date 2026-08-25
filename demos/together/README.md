# Together — Specs 2 + DS Contracts + Decree

Nathan Curtis (Specs 2) and TJ Pitre (DS Contracts) write what a Harbor **Button** is. Decree refuses a checkout that used what they did not permit.

Not Corvy. Not stevendeeds.com. Not SD33DS.

```bash
# from the Decree repo root
node demos/together/prove.mjs
```

| Role | Path | What they own |
|------|------|----------------|
| Nathan / Specs 2 | `nathan/specs.yaml` | Button props, invalid combo, tokens, Ghost deprecated. Anatomy stays here. |
| TJ / DS Contracts | `tj/contracts/*.contract.json` | Same Button as a contract, Figma/code bindings, `semantics.element`. Anatomy stays here. |
| Decree | `out/harbor.contract.json` | Judge slice only: names, props, combos, tokens, deprecations, restyle, native `<button>`. |

- `apps/clean` — legal `variant` / `size`. Verify **passes**.
- `apps/dirty` — ghost variant, forbidden combo, `style=`, deprecated Ghost, invented `MagicButton`, native `<button>`. Verify **fails**.

Landing: [index.html](./index.html). Adapters: [docs/ADAPTERS.md](../../docs/ADAPTERS.md). Board: DECREE #25.
