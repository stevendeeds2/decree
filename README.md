# Decree

**Your design system, enforced.**

If it’s not in the system, it doesn’t ship.

## Why this exists

A design system can be perfectly documented and still drift in the shipped app: an invented `variant`, an inline `style=`, a hardcoded hex, a retired component that came back. Documentation persuades; review catches some of it. AI agents made the volume problem worse — they write plausible UI fast, and they invent just as fast.

The tools that *define* systems are getting very good. [Specs 2](https://www.specsplugin.com) (Nathan Curtis / EightShapes) writes down what a component **is** — anatomy, props, variants, illegal combinations — with schema precision. DS Contracts (TJ Pitre / Southleft) make components machine-readable, with bindings to Figma and code. What neither does is stand at the door.

Decree is the door. It compiles those definitions into a **contract** — only the rules it can refuse — and then:

- **`decree verify`** fails CI on any UI the contract doesn’t permit, one stable error code per violation.
- **`decree mcp`** hands agents an allowlist, so they ask what’s permitted *before* writing code instead of getting caught after.

Decree doesn’t generate code, doesn’t restyle, doesn’t hold style opinions. It refuses. That’s the whole product, and it’s why it composes with Specs 2 and DS Contracts instead of competing with them: they stay the source of truth; Decree makes the truth binding.

North Star — what Decree will and will not become: [docs/NORTH_STAR.md](./docs/NORTH_STAR.md).

## The first ten minutes

Every command below is copy-paste and was run verbatim before commit. Node ≥ 20.

**1. Install**

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install
node bin/decree.js --help
```

**2. Run the whole story**

A fictional design system, Harbor, defined the way real teams would: a Specs 2 catalog and DS Contracts files, both defining the same Button.

```bash
npm run demo:together
```

That compiles both sources, merges them into one contract, passes a clean checkout, and refuses a drifted one with six named findings:

```
DECREE_INVALID_PROP_VALUE    App.tsx:5   Invalid prop variant="ghost" on <Button> — allowed: primary, secondary
DECREE_INVALID_PROP_COMBO    App.tsx:6   Forbidden prop combination on <Button> — variant="secondary", size="lg"
DECREE_RESTYLE_STYLE         App.tsx:9   Restyle of <Button> via style= — use a contract variant or token instead
DECREE_DEPRECATED_COMPONENT  App.tsx:12  Deprecated component <Ghost> — use <Button> instead (Deprecated in Specs)
DECREE_UNKNOWN_COMPONENT     App.tsx:13  Unknown component <MagicButton> — not in the Decree contract allowlist
DECREE_NATIVE_ELEMENT        App.tsx:14  Native <button> used — use allowlisted <Button> instead
```

Who owns what in that story:

| File | Owner | Role |
|------|-------|------|
| [`demos/together/nathan/specs.yaml`](./demos/together/nathan/specs.yaml) | Specs 2 | What Button *is*: props, sizes, one illegal combination, Ghost retired |
| [`demos/together/tj/`](./demos/together/tj/) | DS Contracts | Same Button as a contract: Figma/code bindings, renders native `<button>` |
| [`demos/together/out/harbor.contract.json`](./demos/together/out/harbor.contract.json) | Decree | Only the enforceable slice — names, props, values, combos, tokens |
| [`demos/together/apps/clean/`](./demos/together/apps/clean/) | app team | Uses only what the contract permits — verify passes |
| [`demos/together/apps/dirty/`](./demos/together/apps/dirty/) | nobody, hopefully | Six kinds of drift — verify refuses each by name |

**3. Compile the contract yourself — one product command**

```bash
node bin/decree.js prepare \
  --from-specs demos/together/nathan \
  --from-ds-contracts demos/together/tj \
  --name @demo/harbor-ui --restyle \
  --out /tmp/harbor.contract.json
```

Merge rules are deterministic — Specs is the record for component APIs, DS Contracts for native-element semantics, tokens are unioned. `--restyle` is team policy: also refuse `style=` / `sx=` / paint-and-size classes on allowlisted components. Details: [docs/ADAPTERS.md](./docs/ADAPTERS.md).

**4. Break it, watch it refuse**

Open [`demos/together/apps/clean/App.tsx`](./demos/together/apps/clean/App.tsx) and change `variant="primary"` to `variant="promo"`. Then:

```bash
node bin/decree.js verify demos/together/apps/clean
# DECREE_INVALID_PROP_VALUE  App.tsx:5  Invalid prop variant="promo" on <Button> — allowed: primary, secondary
# exit 1
git checkout -- demos/together/apps/clean/App.tsx
```

That refusal is the product. The same command in CI is the whole enforcement story — a real pull request refused this way: [#22](https://github.com/stevendeeds2/decree/pull/22).

**5. Let an agent ask first**

```bash
node bin/decree.js mcp demos/together/out/harbor.contract.json
```

Prints MCP client config for an allowlist server with four tools: `list_primitives`, `list_tokens`, `is_allowed_primitive`, `validate_snippet`. An agent wired to it learns `variant="ghost"` is refused *before* writing the code. Details: [docs/MCP.md](./docs/MCP.md).

## Use it on your design system

Three entry points, depending on what you already have:

**You have Specs 2 or DS Contracts files** — point the adapters at them (either flag alone works too):

```bash
npx decree prepare --from-specs path/to/specs --from-ds-contracts path/to/contracts --restyle
npx decree verify .
```

**You have a design-system package** — declare sources, compile, hand the contract to apps:

```bash
npx decree sources ./packages/ui   # scaffold decree.sources.json — fill include + tokens
npx decree prepare ./packages/ui   # writes decree.contract.json next to the package
npx decree use ./packages/ui       # copies the contract into the consuming app
npx decree verify .
```

**You have an existing app with drift** — snapshot today’s violations and only fail on new ones:

```bash
npx decree verify . --write-baseline decree.baseline.json
npx decree verify . --baseline decree.baseline.json   # fails only on new findings
```

That ratchet ran against a real open-source app: [demos/PILOT-taxonomy.md](./demos/PILOT-taxonomy.md).

Install as a dependency: `npm install -D github:stevendeeds2/decree` ([docs/INSTALL.md](./docs/INSTALL.md)). CI template: [`.github/examples/decree-verify.yml`](./.github/examples/decree-verify.yml). Full walkthrough: [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md).

## What refusal looks like

Every finding has a stable code — greppable, baselineable, never renamed without a migration note:

| Code | Refuses |
|------|---------|
| `DECREE_UNKNOWN_COMPONENT` | Components not on the allowlist |
| `DECREE_INVALID_PROP_VALUE` / `DECREE_UNKNOWN_PROP` | Props and values the API doesn’t define |
| `DECREE_INVALID_PROP_COMBO` | Combinations the spec forbids |
| `DECREE_DEPRECATED_COMPONENT` / `DECREE_DEPRECATED_TOKEN` | Retired names, with the replacement in the message |
| `DECREE_NATIVE_ELEMENT` | Raw `<button>` where the system has one |
| `DECREE_RESTYLE_STYLE` / `DECREE_RESTYLE_SX` / `DECREE_RESTYLE_ARBITRARY_CLASS` | Painting over allowlisted components |
| `DECREE_HARDCODED_HEX` / `DECREE_HARDCODED_COLOR` / `DECREE_ARBITRARY_VALUE` | Colors and values outside the token set |
| `DECREE_UNKNOWN_TOKEN` | Token names the system never published |

## Demos

Same product under established systems — start at [`demos/index.html`](./demos/index.html).

| Demo | System | Entry |
|------|--------|--------|
| **together** | Specs 2 + DS Contracts + Decree | [`demos/together/`](./demos/together/) · `npm run demo:together` |
| **shadcn** | shadcn/ui (`@demo/shadcn-ui`) | [`demos/shadcn/`](./demos/shadcn/) · 5180 / 5181 |
| **mui** | Material UI (`@demo/mui-ui`) | [`demos/mui/`](./demos/mui/) · 5190 / 5191 |
| **antd** | Ant Design (`@demo/antd-ui`) | [`demos/antd/`](./demos/antd/) · 5200 / 5201 |

Plus a brownfield pilot on a real app: [demos/PILOT-taxonomy.md](./demos/PILOT-taxonomy.md).

## Layout

| Path | Role |
|------|------|
| `bin/`, `src/` | Product CLI + MCP |
| `docs/` | Install, adopt, init, sources, adapters, MCP |
| `demos/` | Runnable case studies (not in the npm tarball) |
| `tests/` | Unit tests |

## Package name

npm unscoped `decree` is taken. This project ships as **`@stevendeeds/decree`**. Registry publish is blocked until a `stevendeeds` org owns the scope — [docs/PUBLISH.md](./docs/PUBLISH.md); git install is the supported channel.
