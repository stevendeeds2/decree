# Plan

North Star: [NORTH_STAR.md](./NORTH_STAR.md). Board: DECREE #22.

## Sequenced work

### 1. Component APIs

Optional `componentApis` map beside `components: string[]`.

Verify codes: `DECREE_UNKNOWN_PROP`, `DECREE_INVALID_PROP_VALUE`, `DECREE_INVALID_PROP_COMBO`.

A missing map means no prop enforcement. Shipped in PR #17 (DECREE #21).

### 2. Adapters

`decree prepare --from-specs` and `--from-ds-contracts`.

Map names, props/enums, invalid combos, tokens, and deprecations. Not anatomy or styles. Shipped in PR #18 (DECREE #23). See [ADAPTERS.md](./ADAPTERS.md). Prototype situation: [`demos/together/`](../demos/together/) (DECREE #25).

### 3. Restyle refusal

Optional `restyle` on the contract. Refuse `style=` / `sx=` / paint-or-size arbitrary class (`w-[32px]`, `bg-[#fff]`) on allowlisted primitives. Layout utilities and `data-[state]` / `[&_svg]` selectors are not refused. Missing `restyle` = no enforcement (MUI `sx` apps stay quiet). DECREE #24.

## Non-goals

- Becoming Specs 2 or DS Contracts.
- Changing `components` to a Record.
- Auto-extracting TypeScript props.
- Registry publish until a `stevendeeds` org exists (DECREE #19). Git install works today.
- Production dogfood.
