# Decree demo — shadcn/ui

The published `@demo/shadcn-ui` contract includes a hand-authored Button API and `restyle: true`. `npm run demo:verify` from the repo root must stay clean.

```bash
open demos/shadcn/index.html
cd demos/shadcn && npm install && npm run dev    # :5180
npm run dev:ai                                   # :5181
```

| Piece | Path | Port |
|-------|------|------|
| Landing | `index.html` | — |
| `@demo/shadcn-ui` | `packages/ui` | — |
| App | `apps/app` | 5180 |
| App AI | `apps/app-ai` | 5181 |
| Evidence | `evidence/` | — |
