# Publishing `@stevendeeds/decree`

## Checklist before `npm publish`

1. `npm test` green  
2. `npm run pack:check` green (no `examples/`, `fixtures/`, `tests/` in tarball)  
3. `npm run pressure` green on `main`  
4. Version bumped in `package.json` (first installable: `0.1.0`)  
5. Auth ready for the chosen registry  

## Channel: GitHub Packages (default)

`package.json` sets:

```json
"publishConfig": {
  "registry": "https://npm.pkg.github.com",
  "access": "restricted"
}
```

### Blocker: scope must match owner

| Package name | GitHub owner today | Result |
|--------------|-------------------|--------|
| `@stevendeeds/decree` | `stevendeeds2` | **Publish rejected** until scope/owner align |
| `@stevendeeds2/decree` | `stevendeeds2` | Works with Packages |
| `@stevendeeds/decree` | org `stevendeeds` | Works if org owns the package |

**Pick one before first publish:**

A. Create GitHub org `stevendeeds`, transfer/publish package there (keeps brand scope).  
B. Temporarily rename package to `@stevendeeds2/decree` for Packages.  
C. Publish to npmjs.org under `@stevendeeds` (needs npm org + login; change `publishConfig.registry`).

### Auth

```bash
# PAT with write:packages, read:packages (and repo for private)
echo "//npm.pkg.github.com/:_authToken=YOUR_PAT" >> ~/.npmrc
echo "@stevendeeds:registry=https://npm.pkg.github.com" >> ~/.npmrc

npm publish
```

Do **not** commit tokens. Agents must not invent PATs.

### Smoke test after publish

```bash
mkdir -p /tmp/decree-smoke && cd /tmp/decree-smoke
npm init -y
npm install @stevendeeds/decree@0.1.0
npx decree --help
# Point verify at a checked-out fixture from the decree repo if available
```

## Alternate: npmjs private

If using npm instead of GitHub Packages:

1. Own `@stevendeeds` on npm.  
2. Set `"publishConfig": { "registry": "https://registry.npmjs.org", "access": "restricted" }`.  
3. `npm login` then `npm publish`.
