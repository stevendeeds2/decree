# Install Decree (`@stevendeeds/decree`)

Node 20 or later.

```bash
npm install -D @stevendeeds/decree
npx decree --help
```

## In an app

```bash
npx decree setup      # finds your design system and sets everything up
npm run decree        # run before you merge
```

## In a design system package

```bash
npx decree sources    # then fill in components.include and tokens
npx decree prepare    # writes decree.contract.json; ship it in your package
```

See [SOURCES.md](./SOURCES.md). To build a contract from Specs 2 or DS Contracts files instead: [ADAPTERS.md](./ADAPTERS.md).

## CI

```bash
npm run decree
npx decree use <your-design-system> --check
```

Template: [`.github/examples/decree-verify.yml`](../.github/examples/decree-verify.yml). Apps that already have problems: [ADOPTION.md](./ADOPTION.md).

## From source

```bash
git clone https://github.com/stevendeeds2/decree.git
cd decree
npm install
node bin/decree.js --help
```
