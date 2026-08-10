# @pulse/ui

Design-system package for the Pulse Reports demo (shadcn-shaped).

Ships `decree.sources.json` + `decree.contract.json`. Consumers run
`decree use` to copy the contract into their app.

```bash
# From Decree repo root
node bin/decree.js prepare demos/pulse-reports/packages/pulse-ui
```

## Used by

- **Pulse Reports** (`demos/pulse-reports/apps/pulse-reports`) — product built with this package
- **Pulse Reports AI** (`demos/pulse-reports/apps/pulse-reports-ai`) — does *not* use this package (screenshot rebuild)
