# Together — Specs 2 + DS Contracts + Decree

Nathan Curtis (Specs 2) and TJ Pitre (DS Contracts) define what a Harbor **Button** is. Decree blocks any app change — human or AI — that uses what the definition does not permit.

`nathan/specs.yaml` follows the published Specs 2 schema ([specsplugin.com/schema](https://www.specsplugin.com/schema/)) — anatomy, prop kinds with `$extensions`, default/variants deltas, `invalidVariantCombinations`, metadata. The DS contract is modeled on TJ's public work. Point either adapter at a real export and it compiles the same slice.

Not Corvy. Not stevendeeds.com. Not SD33DS.

```bash
# from the Decree repo root
node demos/together/prove.mjs

# or compile the merged contract yourself — one product command:
node bin/decree.js prepare \
  --from-specs demos/together/nathan \
  --from-ds-contracts demos/together/tj \
  --name @demo/harbor-ui --out /tmp/harbor.contract.json
```

| Role | Path | What they own |
|------|------|----------------|
| Nathan / Specs 2 | `nathan/specs.yaml` | Button props, illegal combo, tokens, Ghost retired. Anatomy stays here. |
| TJ / DS Contracts | `tj/contracts/*.contract.json` | Same Button as a contract, Figma/code bindings, `semantics.element`. Bindings stay here. |
| Decree | `out/harbor.contract.json` | Only the rules it can enforce: names, props, values, combinations, tokens, retirements, visual overrides, native `<button>`. |

- `apps/clean` — legal `variant` / `size`. Verify **passes**.
- `apps/dirty` — nonexistent ghost variant, illegal combo, inline `style=`, retired Ghost, invented `MagicButton`, raw `<button>`. Verify **fails** with a named error code for each.

Landing: [index.html](./index.html). Adapters: [docs/ADAPTERS.md](../../docs/ADAPTERS.md). Board: DECREE #25.
