# Together — Specs 2 + DS Contracts + Decree

Two authoring formats — a [Specs 2](https://www.specsplugin.com) catalog and a DS Contracts file — define what a Harbor **Button** is. Decree blocks any app change — human or AI — that uses what the definition does not permit.

`specs/specs.yaml` follows the published Specs 2 schema ([specsplugin.com/schema](https://www.specsplugin.com/schema/)) — anatomy, prop kinds with `$extensions`, default/variants deltas, `invalidVariantCombinations`, metadata. `ds-contracts/` is modeled on the public DS Contracts shape. Both sources were written for this demo — the formats' creators aren't involved and haven't endorsed it. Point either adapter at a real export and it compiles the same slice.

Not Corvy. Not stevendeeds.com. Not SD33DS.

```bash
# from the Decree repo root
node demos/together/prove.mjs

# or compile the merged contract yourself — one product command:
node bin/decree.js prepare \
  --from-specs demos/together/specs \
  --from-ds-contracts demos/together/ds-contracts \
  --name @demo/harbor-ui --restyle \
  --out /tmp/harbor.contract.json
```

| Role | Path | What it owns |
|------|------|----------------|
| Specs 2 catalog | `specs/specs.yaml` | Button props, illegal combo, tokens, Ghost retired. Anatomy stays here. |
| DS Contracts file | `ds-contracts/contracts/*.contract.json` | Same Button as a contract, Figma/code bindings, `semantics.element`. Bindings stay here. |
| Decree | `out/harbor.contract.json` | Only the rules it can enforce: names, props, values, combinations, tokens, retirements, visual overrides, native `<button>`. |

- `apps/clean` — legal `variant` / `size`. Verify **passes**. Visual: [preview](./apps/clean/preview.html).
- `apps/dirty` — nonexistent ghost variant, illegal combo, inline `style=`, retired Ghost, invented `MagicButton`, raw `<button>`. Verify **fails** with a named error code for each. Visual: [preview](./apps/dirty/preview.html).

A real refused pull request: [stevendeeds2/decree#22](https://github.com/stevendeeds2/decree/pull/22) — a "limited-offer promo button" forged onto the clean checkout; CI failed with `DECREE_INVALID_PROP_VALUE`, `DECREE_RESTYLE_STYLE`, `DECREE_HARDCODED_HEX`, and the PR was closed without merging.

Landing: [index.html](./index.html). Adapters: [docs/ADAPTERS.md](../../docs/ADAPTERS.md). Board: DECREE #25.
