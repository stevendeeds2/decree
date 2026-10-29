# Decree

Decree checks that apps use the design system as it was published. Install it from npm. You do not clone this repository to use it.

The design system team publishes a list of what is allowed: components, tokens, and, if they want, the props each component accepts. Decree builds that list from the design system, then checks app code and AI coding agents against it. If it's not in the system, it doesn't ship.

Node 20 or later.

## Create the contract (design system)

From your design system package:

```bash
npm install -D @stevendeeds/decree
npx decree sources
npx decree prepare
```

`decree sources` writes `decree.sources.json` and fills in what it can already see: a components folder (`src/components`, `components`, or similar), story and test files to skip, and `tokens.json` if one is there. Open that file and check `components.include`. That list is the only code Decree treats as public components.

`decree prepare` reads those sources and writes `decree.contract.json`. It picks up PascalCase component files (`.jsx`, `.tsx`, `.vue`, `.svelte`), kebab-case files in a components folder, and custom elements registered with `customElements.define` or `@customElement`.

Ship the contract with the package. In `package.json`, add:

```json
"decree": "./decree.contract.json"
```

and add `"decree.contract.json"` to the `files` list you already have. Publish the package the way you usually do. Apps can then install that version and run setup. Run `npx decree prepare` again whenever components or tokens change, and `npx decree prepare --check` in CI so a stale contract fails the build.

Props are optional. List only the ones you want checked, under `componentApis` in `decree.sources.json`, then run `decree prepare` again. Standard HTML attributes such as `type` and `disabled` pass through:

```json
"componentApis": {
  "Button": {
    "props": {
      "variant": { "enum": ["primary", "secondary"] },
      "size": { "enum": ["sm", "md", "lg"] }
    }
  }
}
```

Every option: [docs/SOURCES.md](./docs/SOURCES.md). If you already keep [Specs 2](https://www.specsplugin.com) or [DS Contracts](https://github.com/southleft/ds-contracts-poc) files, Decree can build the contract from those instead. It is an independent project with no affiliation to either. Details: [docs/ADAPTERS.md](./docs/ADAPTERS.md).

## Set up an app

After the design system package ships a contract, in the app:

```bash
npm install -D @stevendeeds/decree
npx decree setup
npm run decree
```

`decree setup` finds the design system in the app's dependencies, copies its contract, notes where the app's own components live and which libraries it may use freely (such as a router), records today's problems in `decree.baseline.json`, and adds `npm run decree`. Commit `decree.contract.json` and `decree.baseline.json`. Running setup again is safe: it keeps your settings and your baseline.

If setup says it couldn't find a design system that ships a contract, the package you depend on doesn't have the `"decree"` field yet. Create the contract in that package (above) and publish it. Pointing setup at a folder works before the publish: `npx decree setup ../your-design-system`.

When the design system ships a new contract, update the copy and keep this app's scan settings:

```bash
npx decree use @your/design-system
npx decree use @your/design-system --check
```

`--check` fails when this app's copy is behind the package, which makes a good CI step.

`scan` belongs to the app. It says where the app's own components live (`localComponentPrefixes`) and which packages it may use freely (`hostPackages`). Everything else in the contract belongs to the design system.

`npm run decree` runs `decree verify`. Put it in CI on every pull request. Each problem has a stable `DECREE_*` code, and any new finding fails the check.

`npx decree mcp decree.contract.json` prints the setup for an MCP server, so an agent in Cursor or Claude can look up what is allowed before it writes code. Details: [docs/MCP.md](./docs/MCP.md).

Install notes: [docs/INSTALL.md](./docs/INSTALL.md). CI template: [`.github/examples/decree-verify.yml`](https://github.com/stevendeeds2/decree/blob/main/.github/examples/decree-verify.yml).

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
| Hardcoded colors (hex, `rgb()`, `hsl()`, and named colors like `white`) and one-off Tailwind sizes like `w-[13px]` | `DECREE_HARDCODED_HEX` / `DECREE_HARDCODED_COLOR` / `DECREE_ARBITRARY_VALUE` | always |
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


## Try the sample in this repository

The sample is not part of the npm package. Clone only if you want to run it:

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install
npm run demo:together
```

Harbor is a made-up design system. The demo builds a contract from a Specs 2 catalog and a set of DS Contracts files, checks an app that follows the contract (it passes), and checks an app with six problems (it fails). The pieces are under [`demos/together/`](./demos/together/).

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
