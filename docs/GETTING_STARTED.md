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
node bin/decree.js sources path/to/your-ds-package
# fill components.include + tokens in decree.sources.json
node bin/decree.js prepare path/to/your-ds-package
node bin/decree.js use path/to/your-ds-package --out ./decree.contract.json
```

See [SOURCES.md](./SOURCES.md) and [INIT.md](./INIT.md). To compile a judge slice from Specs 2 or DS Contracts, see [ADAPTERS.md](./ADAPTERS.md).

## 3. Verify your app

```bash
node bin/decree.js verify .
# exit 0 = ok; non-zero = findings on stderr
```

Brownfield: [ADOPTION.md](./ADOPTION.md) (`--baseline` / `--max-new`).

## 4. Try a demo

```bash
open demos/index.html
```

Pick shadcn, Material UI, or Ant Design. Each landing page explains how to start
its apps and run Decree (pass on the system app, fail on the AI twin).

## 5. MCP (optional)

```bash
node bin/decree.js mcp demos/shadcn/packages/ui/decree.contract.json
```

Details: [MCP.md](./MCP.md).
