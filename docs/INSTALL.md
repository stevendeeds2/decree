# Install Decree (`@stevendeeds/decree`)

Node ≥ 20.

## Supported: install from git

GitHub Packages is blocked until a `stevendeeds` org owns the package (scope `@stevendeeds` vs repo owner `stevendeeds2`). Until then, install the same bits from git:

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

## After GitHub Packages / npmjs is aligned

See [PUBLISH.md](./PUBLISH.md). Then:

```ini
# ~/.npmrc or project .npmrc
@stevendeeds:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install -D @stevendeeds/decree@0.1.0
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

Template: [`.github/examples/decree-verify.yml`](../.github/examples/decree-verify.yml) — installs from git so it works before a registry publish.
