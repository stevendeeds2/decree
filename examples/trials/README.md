# External trials (public apps only)

Vendored **third-party** applications used to pressure-test Decree.

| Folder | Upstream |
|--------|----------|
| `mui-nextjs-ts/` | [mui/material-ui `examples/material-ui-nextjs-ts`](https://github.com/mui/material-ui/tree/master/examples/material-ui-nextjs-ts) |
| `radix-themes-playground/` | [radix-ui/themes `apps/playground`](https://github.com/radix-ui/themes/tree/main/apps/playground) |
| `shadcn-dashboard-starter/` | [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) |

## Policy

Do **not** add Corvy, stevendeeds.com, or SD33DS production trees here.

## Run

```bash
# From decree repo root
npm run trials
```

Writes `examples/trials/_reports/` and refreshes `docs/TRIALS.md`.

`node_modules/` inside trial apps is gitignored.
