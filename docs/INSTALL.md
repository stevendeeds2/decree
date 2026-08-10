# Install Decree (`@stevendeeds/decree`)

Private package. Channel for `0.1.0`: **GitHub Packages** (`https://npm.pkg.github.com`).

## Scope / owner note

The npm scope is `@stevendeeds`. The GitHub repo lives under **`stevendeeds2`**.  
GitHub Packages requires the package scope to match the **owning user or org**.

Until a `stevendeeds` GitHub org owns the package (or the package is renamed to `@stevendeeds2/decree`), `npm publish` to GitHub Packages will fail with a scope mismatch.

Install instructions below assume the package is published under `@stevendeeds/decree` on GitHub Packages (after the owner/scope is aligned).

## Consumer setup (Node ≥ 20)

1. Create or edit `~/.npmrc` (or project `.npmrc`):

```ini
@stevendeeds:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

2. Use a GitHub PAT (classic) with at least `read:packages` (and `repo` if the package is linked to a private repo). In Actions, `GITHUB_TOKEN` works for packages in the same org/user when permissions allow.

3. Install:

```bash
npm install -D @stevendeeds/decree@0.1.0
```

4. Run:

```bash
npx decree init ./node_modules/@your/ds --force
npx decree verify . --write-baseline decree.baseline.json
npx decree verify . --baseline decree.baseline.json
```

See [ADOPTION.md](./ADOPTION.md) for brownfield ratchet and [GETTING_STARTED.md](./GETTING_STARTED.md) for the full walkthrough.

## CI (copy the example)

Template workflow (not enabled by default):  
[`.github/workflows/decree-verify.example.yml`](../.github/workflows/decree-verify.example.yml)

## From this repo (no registry)

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install
open demos/index.html
node bin/decree.js --help
```
