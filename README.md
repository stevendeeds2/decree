# Decree

**Your design system, enforced.**

Soft tools explain the rules. Decree makes them binding — for humans, CI, and AI agents.

If it’s not in the system, it doesn’t ship.

North Star: what Decree will and will not become is in [docs/NORTH_STAR.md](./docs/NORTH_STAR.md).

## Install

### From this repository

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install
node bin/decree.js --help
```

### As a package

```bash
npm install -D github:stevendeeds2/decree
npx decree --help
```

Registry publish is blocked until a `stevendeeds` GitHub (or npm) org owns `@stevendeeds` — [docs/PUBLISH.md](./docs/PUBLISH.md). Git install is the supported channel.

## Configure (your design system)

1. **Scaffold sources** (every option key, empty — fill the form):

```bash
node bin/decree.js sources path/to/your-design-system
# edit decree.sources.json — see docs/SOURCES.md
```

2. **Prepare a contract** from those sources:

```bash
node bin/decree.js prepare path/to/your-design-system
# writes decree.contract.json next to the package
# or compile a judge slice: --from-specs / --from-ds-contracts (docs/ADAPTERS.md)
```

3. **Use it in an app** (copy the rulebook into the app):

```bash
node bin/decree.js use path/to/your-design-system --out ./decree.contract.json
```

4. **Verify** the app:

```bash
node bin/decree.js verify .
```

Brownfield teams can ratchet with a baseline — [docs/ADOPTION.md](./docs/ADOPTION.md).  
Full walkthrough: [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md) · init: [docs/INIT.md](./docs/INIT.md) · MCP: [docs/MCP.md](./docs/MCP.md).

## Demos

Same product shape under established design systems — start at
[`demos/index.html`](./demos/index.html).

| Demo | System | Entry |
|------|--------|--------|
| **shadcn** | shadcn/ui (`@demo/shadcn-ui`) | [`demos/shadcn/`](./demos/shadcn/) · 5180 / 5181 |
| **mui** | Material UI (`@demo/mui-ui`) | [`demos/mui/`](./demos/mui/) · 5190 / 5191 |
| **antd** | Ant Design (`@demo/antd-ui`) | [`demos/antd/`](./demos/antd/) · 5200 / 5201 |

## Layout

| Path | Role |
|------|------|
| `bin/`, `src/` | Product CLI + MCP |
| `docs/` | Install, adopt, init, sources, MCP |
| `demos/` | Runnable case studies (not in the npm tarball) |
| `tests/` | Unit tests |

## Package name

npm unscoped `decree` is taken. This project ships as **`@stevendeeds/decree`**.
