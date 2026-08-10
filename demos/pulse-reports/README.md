# Pulse ecosystem (Decree case study)

Open the landing page **without a server**:

```bash
open demos/pulse-reports/index.html
# or double-click index.html
```

| Piece | Path | Role |
|-------|------|------|
| **Landing** | `index.html` | Static case-study page |
| **@pulse/ui** | `packages/pulse-ui` | Design-system package + Decree contract |
| **Pulse Reports** | `apps/pulse-reports` | Product built **with** @pulse/ui · port **5180** |
| **Pulse Reports AI** | `apps/pulse-reports-ai` | Same UI from **screenshot only** · port **5181** |
| **Evidence** | `evidence/` | Screenshots |

## Start the apps

```bash
cd apps/pulse-reports && npm install && npm run dev      # 5180
cd apps/pulse-reports-ai && npm install && npm run dev   # 5181
```

## Decree trial

```bash
cd ../../../../   # → apps/decree

node bin/decree.js prepare demos/pulse-reports/packages/pulse-ui

node bin/decree.js use demos/pulse-reports/packages/pulse-ui --force \
  --out demos/pulse-reports/apps/pulse-reports/decree.contract.json
# Add scan block for the app (profile app + css excludes) — see index.html / prior notes

node bin/decree.js verify demos/pulse-reports/apps/pulse-reports
# expect ok

cp demos/pulse-reports/apps/pulse-reports/decree.contract.json \
   demos/pulse-reports/apps/pulse-reports-ai/decree.contract.json
node bin/decree.js verify demos/pulse-reports/apps/pulse-reports-ai
# expect fail
```

Default shadcn kitchen sink: https://ui.shadcn.com/themes
