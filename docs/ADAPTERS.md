# Adapters: Specs 2 / DS Contracts → Decree judge slice

They write what a Button **is**. Decree compiles only the slice it can refuse: names, props, values, combinations, tokens, and deprecations.

Do not expect anatomy, layout, styles, or generated code. That stays in Specs / DS Contracts.

## Commands

```bash
decree prepare --from-specs path/to/specs [--out decree.contract.json] [--check]
decree prepare --from-ds-contracts path/to/ds-contracts [--out decree.contract.json] [--check]
decree prepare --from-specs specs/ --from-ds-contracts contracts/ [--out decree.contract.json] [--check]
```

`--check` fails if the committed contract drifted from a fresh compile.

## Using both sources at once

When a team has a Specs catalog **and** DS contract files, pass both flags to compile one merged contract (default output: `./decree.contract.json`). Merge rules are deterministic:

| Field | Rule |
|-------|------|
| `components`, `tokens` | Union of both sources |
| `componentApis`, `deprecations` | Specs is the record when both define the same component (it carries forbidden combinations) |
| `nativeElementMap` | DS Contracts is the record (`semantics.element`) |
| `restyle` | Never set by the merge — turn it on in the contract as team policy |

## What is mapped

| Source | Decree field |
|--------|----------------|
| Component title / `name` / `id` | `components[]` (PascalCase allowlist name) |
| Props with `enum` or `boolean` / `string` / `number` | `componentApis.<Name>.props` |
| Specs `invalidVariantCombinations` | `componentApis.<Name>.forbiddenCombinations` |
| DTCG token files (`tokens.json`, `tokens/`, `*.tokens.json`) | `tokens[]` as `--path-with-dashes` |
| Specs `deprecated` / DS `status: deprecated` | `deprecations.components` |
| DS `semantics.element` | `nativeElementMap` when the tag is a host element |

## What is left behind

Anatomy, default/variant styles, layout, Figma bindings, slot/image/`text` (children) props, `on*` handlers, `arrayOf` structured props, and any token reference that only lives inside a style tree.

React/DOM passthroughs (`className`, `style`, `children`, `key`, `ref`, `id`, `data-*`, `aria-*`, `on*`) are not copied onto `componentApis`.

A missing `componentApis` key still means no prop enforcement for that name.

## Specs 2 input shapes

The adapter reads the published Specs 2 schema ([specsplugin.com/schema](https://www.specsplugin.com/schema/)):

- A catalog: `components: { name: { title, anatomy, props, default, variants, invalidVariantCombinations, subcomponents, metadata } }`
- Prop kinds: `EnumProp` (`type: string` + `enum`), `BooleanProp`, `StringProp`, and `NumberProp` are mapped; `SlotProp` and `ImageProp` are left behind
- `values:` is accepted as a synonym for `enum` (the shape in the CLI overview example)
- `invalidVariantCombinations` (PropConfigurations) → `forbiddenCombinations`
- `default`, `variants`, `anatomy`, `subcomponents`, `metadata`, `$extensions`, `nullable`, `examples`, and slot constraints are read past — never copied to the contract
- `deprecated: true` / `replacement` are Decree extensions; the Specs schema does not cover deprecation

Also accepted: a directory of `api.yaml` / `*.yaml` / `*.json` component files (`title` + `props`), and sibling `tokens.json` or a top-level `tokens:` DTCG tree.

YAML and JSON are accepted. Subcomponents are not promoted to the allowlist.

## DS Contracts input shapes

- `contracts/*.contract.json` (or `.yaml`) with `name` or `id` and a `props` array
- `tokens/**/*.tokens.json` (DTCG)
- Canonical enum values — not canvas spellings (`Primary`) and not code-only bindings beyond `bindings.code.prop`

`status: deprecated` becomes a deprecation notice. `replacement` is copied only when that name is already on the compiled allowlist.

## After compile

```bash
decree verify .
decree mcp decree.contract.json
```

See [NORTH_STAR.md](./NORTH_STAR.md) and [PLAN.md](./PLAN.md). Board: DECREE #23.

A runnable situation (Harbor checkout) lives in [`demos/together/`](../demos/together/): Specs 2 and DS Contracts author the Button; Decree judges a clean app and a dirty one. `node demos/together/prove.mjs`.
