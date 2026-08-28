# Install Decree (`@stevendeeds/decree`)

Node ≥ 20. Install from git — no registry account required:

```bash
npm install -D github:stevendeeds2/decree
npx decree --help
```

From a cloned repo:

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install
node bin/decree.js --help
```

## First commands

```bash
npx decree sources ./packages/ui
# fill decree.sources.json — see SOURCES.md
npx decree prepare ./packages/ui
npx decree use ./packages/ui --force
npx decree verify .
```

Or compile a judge slice from Specs 2 / DS Contracts: [ADAPTERS.md](./ADAPTERS.md).

Brownfield ratchet: [ADOPTION.md](./ADOPTION.md). Walkthrough: [GETTING_STARTED.md](./GETTING_STARTED.md).

## CI

Template: [`.github/examples/decree-verify.yml`](../.github/examples/decree-verify.yml) — installs from git.
