# Getting started

Decree enforces a design-system **contract** against an app: verify in CI, allowlist for agents.

## 1. Install

```bash
npm install
node bin/decree.js --help
```

Private package auth: [INSTALL.md](./INSTALL.md).

## 2. Contract from your design system

Preferred (source-bound, no prune):

```bash
node bin/decree.js prepare path/to/your-ds-package
node bin/decree.js use path/to/your-ds-package --out ./decree.contract.json
```

See [SOURCES.md](./SOURCES.md) and [INIT.md](./INIT.md).

## 3. Verify your app

```bash
node bin/decree.js verify .
# exit 0 = ok; non-zero = findings on stderr
```

Brownfield: [ADOPTION.md](./ADOPTION.md) (`--baseline` / `--max-new`).

## 4. Try a demo

Open the static landing page (no server):

```bash
open demos/pulse-reports/index.html
```

That page explains how to start the Pulse Reports apps (shadcn-shaped `@pulse/ui`) and run Decree against them.

## 5. MCP (optional)

```bash
node bin/decree.js mcp demos/pulse-reports/packages/pulse-ui/decree.contract.json
```

Details: [MCP.md](./MCP.md).
