# Getting started

Decree checks apps and AI agents against a design system's published list of components, props, and tokens.

## In an app

```bash
npm install -D @stevendeeds/decree
npx decree setup
npm run decree
```

`decree setup` needs a design system in your dependencies that ships `decree.contract.json`. If yours doesn't yet, ask the design system team to follow the next section, or point setup at a path: `npx decree setup ../my-design-system`.

## In a design system package

```bash
npm install -D @stevendeeds/decree
npx decree sources     # writes decree.sources.json, pre-filled where it can tell
npx decree prepare     # writes decree.contract.json
```

Decree finds components in `components.include`: PascalCase files (`Button.jsx`, `Button.tsx`, `Button.vue`, `Button.svelte`), kebab-case files in a `components/` folder, and custom elements registered with `customElements.define` or `@customElement`. Tokens come from your DTCG `tokens.json`.

Then ship the contract: add `decree.contract.json` to `files` in `package.json`, and add `"decree": "./decree.contract.json"`. Details and every option: [SOURCES.md](./SOURCES.md).

If you already describe components in Specs 2 or DS Contracts files, Decree can build the contract from those: [ADAPTERS.md](./ADAPTERS.md).

## Apps that already have problems

`decree setup` records today's problems in `decree.baseline.json`, so only new ones fail. More: [ADOPTION.md](./ADOPTION.md).

## AI agents

```bash
npx decree mcp decree.contract.json
```

Prints the setup for an MCP server that tells agents what they may use and checks their code. More: [MCP.md](./MCP.md).
