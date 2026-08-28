# Decree

**Your design system, enforced.**

If it’s not in the system, it doesn’t ship.

## Why this exists

A design system can be perfectly documented and still drift in the shipped app: an invented `variant`, an inline `style=`, a hardcoded hex, a retired component that came back. Documentation persuades; review catches some of it. AI agents made the volume problem worse — they write plausible UI fast, and they invent just as fast.

The tools that *define* systems are getting very good. [Specs 2](https://www.specsplugin.com) writes down what a component **is** — anatomy, props, variants, illegal combinations — with schema precision. DS Contracts make components machine-readable, with bindings to Figma and code. That work is excellent, and Decree is an independent companion to it — no affiliation, plenty of admiration. Definition is in great hands. Enforcement is the gap: someone still has to stand at the door.

Decree is the door. It compiles those definitions into a **contract** — only the rules it can refuse — and then:

- **`decree verify`** fails CI on any UI the contract doesn’t permit, one stable error code per violation.
- **`decree mcp`** hands agents an allowlist, so they ask what’s permitted *before* writing code instead of getting caught after.

Decree doesn’t generate code, doesn’t restyle, doesn’t hold style opinions. It refuses. That’s the whole product, and it’s why it composes with Specs 2 and DS Contracts instead of competing with them: they stay the source of truth; Decree makes the truth binding.

## How it works

**One contract, two doors.** The design system compiles `decree.contract.json` from its existing truth and ships it in the package. Apps copy it in with `decree use`. From there, the same contract is enforced at both places UI gets written:

- **The merge door** — `decree verify` in CI. Any finding is exit 1 with a stable `DECREE_*` code. Humans get refused at review.
- **The generation door** — `decree mcp`. Agents get the allowlist as MCP tools, write only from what’s permitted, and validate their snippet with the same scanners CI runs. Forgery stops at generation, not just merge.

**You choose how deep the contract goes.** Names first. Then, if you ask, how each name may be used. Then, if you ask, whether it may be repainted:

| Layer | Contract field | On | Refuses |
|-------|----------------|----|---------|
| Names + tokens | `components`, `tokens` | always | Unknown components, hardcoded hex/rgb, invented token names |
| Component APIs | `componentApis` | opt-in | Unknown props, illegal values, forbidden combinations |
| Restyle | `restyle` | opt-in | `style=` / `sx=` / paint-and-size classes on system components |
| Native elements | `nativeElementMap` | opt-in | Raw `<button>` where the system has `Button` |

Depth is optional. Failure isn’t. There is no warn mode — a layer that’s on refuses, and a layer that’s off isn’t being asked. You don’t get a softer Decree; you get a thinner or thicker contract.

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
| [`demos/together/specs/specs.yaml`](./demos/together/specs/specs.yaml) | Specs 2 format | What Button *is*: props, sizes, one illegal combination, Ghost retired |
| [`demos/together/ds-contracts/`](./demos/together/ds-contracts/) | DS Contracts format | Same Button as a contract: Figma/code bindings, renders native `<button>` |
| [`demos/together/out/harbor.contract.json`](./demos/together/out/harbor.contract.json) | Decree | Only the enforceable slice — names, props, values, combos, tokens |
| [`demos/together/apps/clean/`](./demos/together/apps/clean/) | app team | Uses only what the contract permits — verify passes |
| [`demos/together/apps/dirty/`](./demos/together/apps/dirty/) | nobody, hopefully | Six kinds of drift — verify refuses each by name |

**3. Compile the contract yourself — one product command**

```bash
node bin/decree.js prepare \
  --from-specs demos/together/specs \
  --from-ds-contracts demos/together/ds-contracts \
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

That refusal is the product. The same command in CI is the whole enforcement story — a real pull request refused this way and closed without merging: [#22](https://github.com/stevendeeds2/decree/pull/22).

**5. Let an agent ask first**

```bash
node bin/decree.js mcp demos/together/out/harbor.contract.json
```

Prints MCP client config for an allowlist server with four tools: `list_primitives`, `list_tokens`, `is_allowed_primitive`, `validate_snippet`. Paste it into `.cursor/mcp.json` (Cursor) or `claude_desktop_config.json` (Claude Desktop) and the agent learns `variant="ghost"` is refused *before* writing the code. Details: [docs/MCP.md](./docs/MCP.md).

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

## FAQ

**Isn’t this just a linter?**
A linter yells after someone wrote the wrong Button — and yells softly. Decree refuses: verify exits nonzero with a stable code per finding, and the same contract is what agents see over MCP, so off-contract UI never gets suggested in the first place. A linter acts at review. Decree acts at generation *and* merge.

**Our product has components the system doesn’t cover. Do we get exceptions?**
There is no exception contract — that would undo the product. Product-local components are handled by scan settings (`scan.profile: "app"`, `localComponentPrefixes`), so your own wrappers are recognized rather than treated as forgeries. Existing debt is handled by the baseline. Neither is a side door for inventing new UI outside the system.

**We have 400 violations today. We can’t turn this on.**
You don’t have to go green on day one. `decree verify . --write-baseline decree.baseline.json` snapshots today’s findings; from then on CI fails only on *new* ones. Debt can stay; debt cannot grow. Fix a batch, rewrite the baseline, repeat, then go absolute. It’s an on-ramp, not a waiver.

**Why didn’t Decree catch a weird prop, or an `sx` restyle?**
That layer isn’t on. No `componentApis` means props aren’t judged; `restyle` off means paint isn’t judged. That’s not a silent pass — that question isn’t being asked yet. Turn a layer on when you mean it; once on, it refuses. There is no warn mode.

**Can we still write plain HTML?**
Yes. `nativeElementMap` is not a ban on HTML — it’s a replacement map. Map `button` → `Button` and a raw `<button>` fails as a forgery of the system Button. Tags not in the map are never native-element findings; `<div>` and `<span>` are fine as HTML.

**Then why did my raw `<button style={{background:'#3b82f6'}}>` fail with restyle off?**
The hex. Color checks are the token layer, always on — `DECREE_HARDCODED_HEX`. Invented paint fails even on a raw tag.

**What happens when we deprecate a component?**
It stays on the allowlist — it’s still in the system — but any use fails with `DECREE_DEPRECATED_COMPONENT` and the replacement in the message. Existing use can sit on a baseline; new use blocks. Removing the name entirely is a different story: then it’s an unknown component.

**Does Decree replace our spec, read Figma, or generate the Button?**
No, no, and no. Specs 2, DS Contracts, and Figma author the system. Decree compiles only the slice it can refuse and judges apps and agents against it. They stay the authors; Decree stays the judge.

**Who owns the contract?**
The design system team. They compile it from truth they already maintain (`decree prepare`) and ship `decree.contract.json` in the package like any other artifact. Product teams consume it (`decree use`), run verify in CI, and wire MCP. They don’t author a second system — they get judged against the one that shipped.

**Does it check CSS?**
As the token layer: hardcoded hex, `rgb()`/`hsl()`, arbitrary values like `[32px]`, and `var(--names)` the system never published — in `.css` and in JS/TSX. It’s a token check that happens to run on CSS files, not a style-matching engine.

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

---

Ships as **`@stevendeeds/decree`** (unscoped `decree` is taken on npm) · `npm install -D github:stevendeeds2/decree` · MIT
