# Plan

North Star: [NORTH_STAR.md](./NORTH_STAR.md). Board: DECREE #22.

## Sequenced work

### 1. Component APIs

Optional `componentApis` map beside `components: string[]`.

Verify codes: `DECREE_UNKNOWN_PROP`, `DECREE_INVALID_PROP_VALUE`, `DECREE_INVALID_PROP_COMBO`.

A missing map means no prop enforcement. Shipped in PR #17 (DECREE #21).

### 2. Adapters

`decree prepare --from-specs` and `--from-ds-contracts`.

Map names, props/enums, invalid combos, tokens, and deprecations. Not anatomy or styles. DECREE #23. See [ADAPTERS.md](./ADAPTERS.md).

### 3. Restyle refusal

Refuse `style` / `sx` / arbitrary class on system primitives. Parked (false-positive risk). DECREE #24.

## Non-goals

- Becoming Specs 2 or DS Contracts.
- Changing `components` to a Record.
- Auto-extracting TypeScript props.
- Publishing (DECREE #19 is a scope/owner blocker).
- Production dogfood.
