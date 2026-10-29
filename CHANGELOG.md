# Changelog

## 0.2.0

### New

- **`decree setup`.** One command in an app: finds the design system, copies its contract, notes where the app's own components live and which libraries it relies on, records today's problems as a baseline, and adds `npm run decree`. Safe to run again.
- **More markup.** Decree now reads htm and Lit tagged templates, Vue single-file components, Svelte components, and Angular `.component.html` templates, as well as JSX. The same checks apply to all of them.
- **Custom elements.** Contracts can list tags like `sl-button`. Unknown tags are flagged only under prefixes the design system owns, so third-party elements are left alone. `scan.customElementPrefixes` and `scan.templateTags` adjust this.
- **`decree use --check`.** Fails when an app's copy of the contract is behind the design system's.
- **`scan.hostPackages`.** Lets an app use libraries like a router or drag-and-drop without their components being flagged.
- **`tokens.modes`.** A design system with light and dark modes in `tokens.json` can allow the mode-free token names apps reference.

### Changed

- **Plain-language messages.** Each finding says what's wrong and what to use instead. Codes are unchanged.
- **Baselines match on the thing found** (a color, a component, a prop value), not on message wording. **Rewrite baselines from 0.1.0 once:** `decree verify . --write-baseline decree.baseline.json`.
- **`decree use` updates in place** and keeps the app's `scan` settings. `--force` is no longer needed.
- Context `Provider` and `Consumer` tags are not reported as unknown components.
- Published to the public npm registry: `npm install -D @stevendeeds/decree`.

## 0.1.0

First release: contracts, `decree verify` with baselines, MCP tools for agents, Specs 2 and DS Contracts adapters, component APIs, deprecations, and restyle checks.
