# Decree

Decree checks that apps use the design system as it was published.

The design system team publishes a list of what is allowed: components, tokens, and, if they want, the props each component accepts. Decree checks app code and AI coding agents against that list and reports anything that isn't on it. If it's not in the system, it doesn't ship.

Decree works alongside the tools teams already use to describe their components. [Specs 2](https://www.specsplugin.com) records each component's props, variants, and forbidden combinations. [DS Contracts](https://github.com/southleft/ds-contracts-poc) describe components in a machine-readable format, with links to Figma and code. Decree reads both and turns them into one list it can check against. It is an independent project with no affiliation to either.

## Who does what

| Team | What they do |
|------|--------------|
| **Design system team** | Writes and publishes `decree.contract.json` inside the design system package, built from the specs they already keep (`decree prepare`). |
| **App team** | Copies the contract into the app with `decree use`. Runs `decree verify` before merging. Can give AI agents the same list through `decree mcp`. |

The contract belongs to the design system, except for its `scan` section, which belongs to the app. `scan` tells Decree how to read this app: where its own components live (`localComponentPrefixes`) and which packages it may use freely, such as a router (`hostPackages`). When the design system ships a new version, run `decree use` again; it updates the copy and keeps the app's `scan` settings. `decree use <package> --check` fails when the app's copy is out of date, which makes a good CI step.

`decree verify` is built to run in CI, the automated checks that run on every pull request. Each problem it finds has a stable `DECREE_*` code, and any finding fails the check.

`decree mcp` starts an MCP server. MCP is the protocol tools like Cursor and Claude use to give an AI agent extra information. Through it, an agent can look up what is allowed before writing code, then check its own snippet the same way CI will.

## The first ten minutes

Every command below can be copied and pasted as written. You need Node 20 or later.

**1. Install**

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install
node bin/decree.js --help
```

**2. Run the full demo**

Harbor is a made-up design system, described the way a real team would: a Specs 2 catalog and a set of DS Contracts files, both describing the same Button.

```bash
npm run demo:together
```

The demo builds a contract from both sources, checks a clean app (it passes), and checks an app with problems (it fails with six findings):

```
DECREE_INVALID_PROP_VALUE    App.tsx:5   <Button> doesn't accept variant="ghost". Use one of: primary, secondary.
DECREE_INVALID_PROP_COMBO    App.tsx:6   <Button> can't use variant="secondary" and size="lg" together.
DECREE_RESTYLE_STYLE         App.tsx:9   Inline style= on <Button> paints over a design-system component. Use one of its props or a token instead.
DECREE_DEPRECATED_COMPONENT  App.tsx:12  <Ghost> is being retired. Use <Button> instead. (Deprecated in Specs)
DECREE_UNKNOWN_COMPONENT     App.tsx:13  <MagicButton> isn't part of the design system. Use a design-system component instead.
DECREE_NATIVE_ELEMENT        App.tsx:14  Plain <button> where the design system has <Button>. Use <Button> instead.
```

| File | What it is |
|------|------------|
| [`demos/together/specs/specs.yaml`](./demos/together/specs/specs.yaml) | Specs 2: Button's props and sizes, one forbidden combination, and the retired Ghost component |
| [`demos/together/ds-contracts/`](./demos/together/ds-contracts/) | DS Contracts: the same Button, with Figma and code links; it renders a native `<button>` |
| [`demos/together/out/harbor.contract.json`](./demos/together/out/harbor.contract.json) | The contract Decree builds: the parts of both sources it can check |
| [`demos/together/apps/clean/`](./demos/together/apps/clean/) | An app that uses only what the contract allows |
| [`demos/together/apps/dirty/`](./demos/together/apps/dirty/) | An app with six kinds of problems |

**3. Build the contract yourself**

```bash
node bin/decree.js prepare \
  --from-specs demos/together/specs \
  --from-ds-contracts demos/together/ds-contracts \
  --name @demo/harbor-ui --restyle \
  --out /tmp/harbor.contract.json
```

When the two sources overlap, Specs 2 decides component props, DS Contracts decides which native HTML element a component replaces, and tokens from both are combined. `--restyle` turns on the check for `style=`, `sx=`, and paint or size classes on system components. Details: [docs/ADAPTERS.md](./docs/ADAPTERS.md).

**4. Break it and watch it fail**

Open [`demos/together/apps/clean/App.tsx`](./demos/together/apps/clean/App.tsx) and change `variant="primary"` to `variant="promo"`. Then:

```bash
node bin/decree.js verify demos/together/apps/clean
# DECREE_INVALID_PROP_VALUE  App.tsx:5  <Button> doesn't accept variant="promo". Use one of: primary, secondary.
# exit 1
git checkout -- demos/together/apps/clean/App.tsx
```

Run the same command in CI and the pull request fails. Here is a real one that failed this way and was closed without merging: [#22](https://github.com/stevendeeds2/decree/pull/22).

**5. Give an agent the list**

```bash
node bin/decree.js mcp demos/together/out/harbor.contract.json
```

This prints the setup for an MCP server with four tools: `list_primitives`, `list_tokens`, `is_allowed_primitive`, and `validate_snippet`. Paste it into `.cursor/mcp.json` (Cursor) or `claude_desktop_config.json` (Claude Desktop). The agent can now see that `variant="ghost"` isn't allowed before it writes the code. Details: [docs/MCP.md](./docs/MCP.md).

## What it checks

Names and tokens are always checked. Props, restyling, and native HTML are optional; the design system team turns each on in the contract. A check that is on fails on every problem it finds. A check that is off doesn't run.

| What it catches | Code | Check |
|-----------------|------|-------|
| Components that aren't on the list | `DECREE_UNKNOWN_COMPONENT` | always |
| Props and values the component doesn't accept | `DECREE_UNKNOWN_PROP` / `DECREE_INVALID_PROP_VALUE` | optional (`componentApis`) |
| Prop combinations a spec forbids | `DECREE_INVALID_PROP_COMBO` | optional (`componentApis`) |
| Retired components and tokens, with the replacement named in the message | `DECREE_DEPRECATED_COMPONENT` / `DECREE_DEPRECATED_TOKEN` | always |
| Raw HTML where the system has a component, such as `<button>` when there's a `Button` | `DECREE_NATIVE_ELEMENT` | optional (`nativeElementMap`) |
| Paint over system components: `style=`, `sx=`, arbitrary classes | `DECREE_RESTYLE_STYLE` / `DECREE_RESTYLE_SX` / `DECREE_RESTYLE_ARBITRARY_CLASS` | optional (`restyle`) |
| Hardcoded colors and sizes | `DECREE_HARDCODED_HEX` / `DECREE_HARDCODED_COLOR` / `DECREE_ARBITRARY_VALUE` | always |
| CSS variables the system never published | `DECREE_UNKNOWN_TOKEN` | always |

Codes don't change, so you can search for them, filter on them, and record them in a baseline.

## Which markup it reads

- **JSX and TSX.**
- **Tagged templates**, such as htm (`` html`<${Button}>` ``) and Lit (`` html`<sl-button>` ``). Custom elements are checked only under the prefixes the design system owns, such as `sl-`. Third-party elements are left alone. Templates tagged `html` or `svg` are read by default; `scan.templateTags` changes that.
- **Vue single-file components, Svelte components, and Angular component templates** (`.component.html`).
- **CSS**, plus the style blocks inside those files, gets the color and token checks.

## Starting on an app that already has problems

Most apps won't pass on the first run. Record today's findings as a baseline, then fail only on new ones:

```bash
npx decree verify . --write-baseline decree.baseline.json
npx decree verify . --baseline decree.baseline.json   # fails only on new findings
```

Existing problems can stay for now, and new ones can't be added. Fix a batch, write the baseline again, and repeat until it's empty. We ran this on a real open-source app: [demos/PILOT-taxonomy.md](./demos/PILOT-taxonomy.md).

To set Decree up on your own design system package:

```bash
npx decree sources ./packages/ui   # scaffold decree.sources.json — fill include + tokens
npx decree prepare ./packages/ui   # writes decree.contract.json next to the package
npx decree use ./packages/ui       # copies the contract into the consuming app
npx decree verify .
```

Install: `npm install -D github:stevendeeds2/decree` ([docs/INSTALL.md](./docs/INSTALL.md)). CI template: [`.github/examples/decree-verify.yml`](./.github/examples/decree-verify.yml). Full walkthrough: [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md).

## FAQ

**Is this just a linter?**
It works like one in CI: it reads your code and fails on problems. Two things are different. The list comes from the design system team, so app teams don't maintain their own rules. And the same list is available to AI agents through MCP, so they can check before they write code.

**Our product has its own components. Do we need exceptions?**
No. Set `scan.profile: "app"` and `localComponentPrefixes` in the contract's scan settings, and Decree recognizes your own components as yours. Components from libraries the app relies on, like a router or drag-and-drop, go in `hostPackages`. Existing problems go in the baseline. None of these let new, off-system UI through.

**We have 400 violations today. Can we still turn this on?**
Yes. Write a baseline (`--write-baseline`) and CI fails only on new findings. Pay down the old ones in batches.

**Why didn't it catch a wrong prop or an `sx` restyle?**
Those checks are optional, and they're off. Without `componentApis` in the contract, props aren't checked. Without `restyle`, `style=` and `sx=` aren't checked. Turn them on when your team is ready.

**Can we still write plain HTML?**
Yes. `nativeElementMap` only lists HTML tags that have a system component. If `button` maps to `Button`, a raw `<button>` fails. Tags that aren't in the map, like `<div>` and `<span>`, are fine. Hardcoded colors still fail on any tag, because the color check is always on.

**What happens when we retire a component?**
It stays in the contract, marked as retired. Any use fails with `DECREE_DEPRECATED_COMPONENT`, and the message names the replacement. Existing uses can go in the baseline. If you remove it from the contract entirely, uses fail as unknown components.

**Does it replace our spec or read Figma?**
No. Your specs, DS Contracts files, and Figma stay where they are. Decree reads the specs and DS Contracts files and builds a contract from the parts it can check. It doesn't read Figma, and it doesn't generate components.

**Who owns the contract?**
The design system team. They build it with `decree prepare` and publish `decree.contract.json` in their package like any other file. App teams copy it in with `decree use`, run `decree verify` in CI, and set up MCP for their agents.

## Demos

Start at [`demos/index.html`](./demos/index.html).

| Demo | System | Entry |
|------|--------|-------|
| **together** | Specs 2 + DS Contracts | [`demos/together/`](./demos/together/) · `npm run demo:together` |
| **shadcn** | shadcn/ui (`@demo/shadcn-ui`) | [`demos/shadcn/`](./demos/shadcn/) · ports 5180 / 5181 |
| **mui** | Material UI (`@demo/mui-ui`) | [`demos/mui/`](./demos/mui/) · ports 5190 / 5191 |
| **antd** | Ant Design (`@demo/antd-ui`) | [`demos/antd/`](./demos/antd/) · ports 5200 / 5201 |

There is also a pilot on a real app that already had problems: [demos/PILOT-taxonomy.md](./demos/PILOT-taxonomy.md).

## Repo layout

| Path | What's there |
|------|--------------|
| `bin/`, `src/` | The CLI and MCP server |
| `docs/` | Install, adoption, setup, sources, adapters, MCP |
| `demos/` | Runnable examples (not in the npm package) |
| `tests/` | Unit tests |
