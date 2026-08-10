# @pulse/ui

Design-system package for the Pulse case study (shadcn-shaped components + tokens).

In a real org this would publish to npm. Here it lives next to the apps as `file:` / Vite alias dependency.

## Contents

- `src/components/ui/*` — primitives (Button, Card, Chart, Table, …)
- `src/tokens.css` — design tokens
- `decree.sources.json` / `decree.contract.json` — Decree rulebook (source-bound)

## Prepare contract

```bash
cd ../../../../   # apps/decree
node bin/decree.js prepare demos/pulse-reports/packages/pulse-ui
# then ensure scan block on contract for consumer apps — see apps/pulse-reports
```

## Consumers

- **Pulse Reports** (`apps/pulse-reports`) — product built with this package  
- **Pulse Reports AI** (`apps/pulse-reports-ai`) — does *not* use this package (screenshot rebuild)
