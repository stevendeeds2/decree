# Pulse ecosystem (Decree case study)

Open the landing page **without a server**:

```bash
open demos/pulse-reports/index.html
# or double-click demos/pulse-reports/index.html
```

| Piece | Path | Role |
|-------|------|------|
| **Landing** | `demos/pulse-reports/index.html` | Static case-study page |
| **@pulse/ui** | `demos/pulse-reports/packages/pulse-ui` | Design-system package + Decree contract |
| **Pulse Reports** | `demos/pulse-reports/apps/pulse-reports` | Product built **with** @pulse/ui · port **5180** |
| **Pulse Reports AI** | `demos/pulse-reports/apps/pulse-reports-ai` | Same UI from **screenshot only** · port **5181** |
| **Evidence** | `demos/pulse-reports/evidence/` | Screenshots |

## Start the apps

```bash
cd demos/pulse-reports
npm install          # installs @pulse/ui + both apps
npm run dev          # Pulse Reports → http://127.0.0.1:5180
npm run dev:ai       # Pulse Reports AI → http://127.0.0.1:5181
```

## Decree trial

From the Decree repo root:

```bash
node bin/decree.js prepare demos/pulse-reports/packages/pulse-ui

node bin/decree.js use demos/pulse-reports/packages/pulse-ui --force \
  --out demos/pulse-reports/apps/pulse-reports/decree.contract.json
# Add scan block for the app (profile app + css excludes) if prepare overwrote it

node bin/decree.js verify demos/pulse-reports/apps/pulse-reports
# expect ok

cp demos/pulse-reports/apps/pulse-reports/decree.contract.json \
   demos/pulse-reports/apps/pulse-reports-ai/decree.contract.json
node bin/decree.js verify demos/pulse-reports/apps/pulse-reports-ai
# expect fail
```

Default shadcn kitchen sink: https://ui.shadcn.com/themes
