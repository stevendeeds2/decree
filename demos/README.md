# Demos

Same product shape under established design systems. Start at
[`index.html`](./index.html) (static hub).

| Demo | System | Ports | Start |
|------|--------|-------|--------|
| [shadcn](./shadcn/) | shadcn/ui (`@demo/shadcn-ui`) | 5180 / 5181 | `cd demos/shadcn && npm install && npm run dev` |
| [mui](./mui/) | Material UI (`@demo/mui-ui`) | 5190 / 5191 | `cd demos/mui && npm install && npm run dev` |
| [antd](./antd/) | Ant Design (`@demo/antd-ui`) | 5200 / 5201 | `cd demos/antd && npm install && npm run dev` |
| [together](./together/) | Specs 2 + DS Contracts + Decree | — | `node demos/together/prove.mjs` |

Each demo: design-system package + compliant app + AI-from-screenshot twin + static landing.

Real-app pilot: [PILOT-taxonomy.md](./PILOT-taxonomy.md) — Decree run on shadcn's open-source Taxonomy app. Drift found (raw `<button>`s despite a shipped `Button`), ratchet held.
