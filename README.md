# Decree

**Your design system, enforced.**

Soft tools explain the rules. Decree makes them binding — for humans, CI, and AI agents.

If it’s not in the system, it doesn’t ship.

## Install

```bash
npm install -g @stevendeeds/decree
# or use via npx / local bin — see docs/INSTALL.md for GitHub Packages auth
```

From this repo:

```bash
cd apps/decree   # or clone stevendeeds2/decree
npm install
node bin/decree.js --help
```

## Configure (your design system)

1. **Prepare a contract** from your design-system package (source-bound):

```bash
node bin/decree.js prepare path/to/your-design-system
# writes decree.contract.json next to the package (see docs/SOURCES.md)
```

2. **Use it in an app** (copy or link the rulebook):

```bash
node bin/decree.js use path/to/your-design-system --out ./decree.contract.json
```

3. **Verify** the app:

```bash
node bin/decree.js verify .
```

Brownfield teams can ratchet with a baseline — [docs/ADOPTION.md](./docs/ADOPTION.md).  
Full walkthrough: [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md) · init details: [docs/INIT.md](./docs/INIT.md) · MCP: [docs/MCP.md](./docs/MCP.md).

## Demos

Same product app, different design systems — under [`demos/`](./demos/).

| Demo | System | Entry |
|------|--------|--------|
| **Pulse Reports** | shadcn-shaped (`@pulse/ui`) | Open [`demos/pulse-reports/index.html`](./demos/pulse-reports/index.html) (no server) |

More system variants (e.g. Material UI) will land beside Pulse under `demos/`.

## What ships

| Path | Role |
|------|------|
| `bin/`, `src/` | Product CLI + MCP |
| `docs/` | Install, adopt, init, sources, MCP |
| `demos/` | Runnable case studies (not in the npm tarball) |
| `tests/` | Unit tests (self-contained) |

## Package

npm unscoped `decree` is taken. This project is **`@stevendeeds/decree`**.
