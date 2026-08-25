# Publish `@stevendeeds/decree`

The package name stays `@stevendeeds/decree`. That is the product name.

## What works today (the viable channel)

Install from the public git repo. No GitHub Packages org and no npmjs org required:

```bash
npm install -D github:stevendeeds2/decree
npx decree --help
```

CI template: [`.github/examples/decree-verify.yml`](../.github/examples/decree-verify.yml).

`npm pack` + a clean install is proven in this repo by `npm run pack:smoke`.

## What is still blocked (registry publish)

`publishConfig` still points at GitHub Packages. GitHub Packages requires the scope to match the owning user or org.

| Option | Status |
|--------|--------|
| Transfer the repo to a `stevendeeds` GitHub org, then `npm publish` | Human — not an agent action |
| Rename to `@stevendeeds2/decree` | Rejected — AGENTS.md locks the package name |
| npmjs org `@stevendeeds` + `npm publish --registry https://registry.npmjs.org` | Human — create the org, then publish |

Do not send peer invites that claim the package is on GitHub Packages or npmjs until one of those is done and a clean `npm install -D @stevendeeds/decree` works.

## After the org exists

```bash
npm test
npm run pack:check
npm run pack:smoke
npm publish
```

Then smoke from an empty directory:

```bash
npm install -D @stevendeeds/decree@0.1.0
npx decree --help
```
