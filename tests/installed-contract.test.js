import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProjectContract } from '../src/contract/resolve.js';
import { verifyPath } from '../src/verify/index.js';
import { loadMcpContext } from '../src/mcp/server.js';
import { listPrimitives, listTokens } from '../src/mcp/allowlist.js';

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** App whose decree.contract.json points at @acme/ui and does not copy the allowlist. */
function makePointedApp() {
  const root = mkdtempSync(join(tmpdir(), 'decree-installed-'));
  const ds = join(root, 'node_modules', '@acme', 'ui');
  mkdirSync(ds, { recursive: true });
  writeJson(join(ds, 'package.json'), {
    name: '@acme/ui',
    version: '1.0.0',
    decree: './decree.contract.json',
  });
  writeJson(join(ds, 'decree.contract.json'), {
    version: 1,
    name: '@acme/ui',
    components: ['Button'],
    tokens: [{ name: '--acme-color-primary' }],
    nativeElementMap: {},
    componentApis: {
      Button: { props: { variant: { enum: ['primary'] } } },
    },
    deprecations: {
      components: { OldButton: { replacement: 'Button', reason: 'Renamed' } },
    },
    restyle: { style: true, sx: false, arbitraryClass: false },
  });
  // deprecations must refer to allowlisted components
  const contract = JSON.parse(readFileSync(join(ds, 'decree.contract.json'), 'utf8'));
  contract.components.push('OldButton');
  writeJson(join(ds, 'decree.contract.json'), contract);

  mkdirSync(join(root, 'node_modules', 'wouter'), { recursive: true });
  writeJson(join(root, 'node_modules', 'wouter', 'package.json'), { name: 'wouter' });
  writeJson(join(root, 'package.json'), {
    name: 'app',
    dependencies: { '@acme/ui': '1.0.0', wouter: '3.0.0' },
  });
  writeJson(join(root, 'decree.contract.json'), {
    version: 1,
    designSystem: '@acme/ui',
    scan: {
      profile: 'app',
      localComponentPrefixes: ['src'],
      hostPackages: ['wouter'],
    },
  });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'App.jsx'),
    `import { Link } from 'wouter';
import { Button } from '@acme/ui';
export function App() {
  return <Link href="/"><Button variant="primary">Go</Button></Link>;
}
`,
  );
  writeFileSync(
    join(root, 'src', 'theme.css'),
    '.a { color: var(--acme-color-primary); }\n',
  );
  return { root, ds };
}

describe('installed design-system contract', () => {
  it('judges the app against the package, and scan stays in the app file', () => {
    const { root, ds } = makePointedApp();
    try {
      const appFile = readFileSync(join(root, 'decree.contract.json'), 'utf8');
      const before = verifyPath(root);
      assert.equal(before.ok, true, JSON.stringify(before.findings, null, 2));
      assert.equal(readFileSync(join(root, 'decree.contract.json'), 'utf8'), appFile);

      const pkgContractPath = join(ds, 'decree.contract.json');
      const pkgContract = JSON.parse(readFileSync(pkgContractPath, 'utf8'));
      pkgContract.components = pkgContract.components.filter((name) => name !== 'Button');
      pkgContract.tokens = [{ name: '--acme-color-other' }];
      delete pkgContract.componentApis;
      delete pkgContract.deprecations;
      writeJson(pkgContractPath, pkgContract);

      const after = verifyPath(root);
      assert.equal(after.ok, false);
      const codes = after.findings.map((f) => `${f.code}:${f.subject ?? f.message}`);
      assert.ok(codes.some((c) => c.includes('Button')));
      assert.ok(codes.some((c) => c.includes('--acme-color-primary')));
      assert.equal(readFileSync(join(root, 'decree.contract.json'), 'utf8'), appFile);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses an allowlist key on the app pointer', () => {
    const { root } = makePointedApp();
    try {
      const path = join(root, 'decree.contract.json');
      const pointer = JSON.parse(readFileSync(path, 'utf8'));
      pointer.tokens = [{ name: '--sneaky' }];
      writeJson(path, pointer);
      assert.throws(() => loadProjectContract(path), /cannot set "tokens"/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps reading a copied allowlist until the app migrates', () => {
    const { root, ds } = makePointedApp();
    try {
      writeJson(join(root, 'decree.contract.json'), {
        version: 1,
        components: ['Card'],
        tokens: [{ name: '--acme-color-primary' }],
        nativeElementMap: {},
        scan: { profile: 'app', localComponentPrefixes: ['src'], hostPackages: ['wouter'] },
      });
      const result = verifyPath(root);
      assert.equal(result.ok, false);
      assert.ok(result.findings.some((f) => String(f.subject ?? f.message).includes('Button')));
      const pkg = JSON.parse(readFileSync(join(ds, 'decree.contract.json'), 'utf8'));
      assert.ok(pkg.components.includes('Button'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('drops a host package when the app scan no longer lists it', () => {
    const { root } = makePointedApp();
    try {
      const path = join(root, 'decree.contract.json');
      const pointer = JSON.parse(readFileSync(path, 'utf8'));
      delete pointer.scan.hostPackages;
      writeJson(path, pointer);
      const result = verifyPath(root);
      assert.equal(result.ok, false);
      assert.ok(result.findings.some((f) => String(f.subject ?? f.message).includes('Link')));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('MCP lists the installed package, not a list the app could edit', () => {
    const { root } = makePointedApp();
    try {
      const ctx = loadMcpContext(join(root, 'decree.contract.json'));
      const names = listPrimitives(ctx.contract).map((p) => p.name);
      assert.deepEqual(names.sort(), ['Button', 'OldButton']);
      assert.deepEqual(listTokens(ctx.contract).map((t) => t.name), ['--acme-color-primary']);
      assert.equal(ctx.contract.componentApis.Button.props.variant.enum[0], 'primary');
      assert.equal(ctx.contract.restyle.style, true);
      const app = JSON.parse(readFileSync(join(root, 'decree.contract.json'), 'utf8'));
      assert.equal(app.components, undefined);
      assert.equal(app.tokens, undefined);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
