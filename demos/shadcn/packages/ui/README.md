# @demo/shadcn-ui

Design-system package for the Pulse Reports demo (shadcn-shaped).

Ships `decree.sources.json` + `decree.contract.json`. Consumers run
`decree use` to copy the contract into their app.

```bash
# From Decree repo root
node bin/decree.js prepare demos/shadcn/packages/ui
```

## Used by

- **Pulse Reports** (`demos/shadcn/apps/app`) — product built with this package
- **Pulse Reports AI** (`demos/shadcn/apps/app-ai`) — does *not* use this package (screenshot rebuild)
