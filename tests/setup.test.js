import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const decreeBin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'decree.js');

/** An app with a design-system package in node_modules that ships a contract. */
function makeApp() {
  const root = mkdtempSync(join(tmpdir(), 'decree-setup-'));
  const ds = join(root, 'node_modules', '@acme', 'ui');
  mkdirSync(ds, { recursive: true });
  writeFileSync(
    join(ds, 'package.json'),
    JSON.stringify({ name: '@acme/ui', version: '1.0.0', decree: './decree.contract.json' }),
  );
  writeFileSync(
    join(ds, 'decree.contract.json'),
    JSON.stringify({
      version: 1,
      name: '@acme/ui',
      components: ['Button', 'Card'],
      tokens: [{ name: '--acme-color-primary' }],
      nativeElementMap: { button: 'Button' },
    }),
  );
  mkdirSync(join(root, 'node_modules', 'wouter'), { recursive: true });
  writeFileSync(join(root, 'node_modules', 'wouter', 'package.json'), JSON.stringify({ name: 'wouter' }));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'app', dependencies: { '@acme/ui': '1.0.0', wouter: '3.0.0' } }, null, 2),
  );
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'App.jsx'),
    `import { Router, Route } from 'wouter';
import { Button, Card } from '@acme/ui';
function Header() { return <h1>Hi</h1>; }
export function App() {
  return <Router><Route path="/"><Header /><Card><Button>Go</Button><button>raw</button></Card></Route></Router>;
}
`,
  );
  return root;
}

const run = (cwd, ...args) =>
  spawnSync(process.execPath, [decreeBin, ...args], { cwd, encoding: 'utf8' });

describe('decree setup', () => {
  it('finds the design system, writes app settings, a baseline, and a script', () => {
    const app = makeApp();
    try {
      const setup = run(app, 'setup');
      assert.equal(setup.status, 0, setup.stderr);
      assert.match(setup.stdout, /set up against @acme\/ui/);
      assert.match(setup.stdout, /Recorded 1 problem/);

      const contract = JSON.parse(readFileSync(join(app, 'decree.contract.json'), 'utf8'));
      assert.deepEqual(contract.scan, {
        profile: 'app',
        localComponentPrefixes: ['src'],
        hostPackages: ['wouter'],
      });
      const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
      assert.equal(pkg.scripts.decree, 'decree verify . --baseline decree.baseline.json');

      const verify = run(app, 'verify', '.', '--baseline', 'decree.baseline.json');
      assert.equal(verify.status, 0, verify.stderr + verify.stdout);

      writeFileSync(
        join(app, 'src', 'New.jsx'),
        'export const New = () => <MagicCard style={{ color: "#ff00aa" }} />;\n',
      );
      const after = run(app, 'verify', '.', '--baseline', 'decree.baseline.json');
      assert.equal(after.status, 1, after.stdout);
      assert.match(after.stderr + after.stdout, /MagicCard/);
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });

  it('is safe to run again and keeps settings the app changed', () => {
    const app = makeApp();
    try {
      assert.equal(run(app, 'setup').status, 0);
      const path = join(app, 'decree.contract.json');
      const edited = JSON.parse(readFileSync(path, 'utf8'));
      edited.scan.localComponentPrefixes = ['src/ui'];
      writeFileSync(path, JSON.stringify(edited, null, 2));

      writeFileSync(join(app, 'src', 'New.jsx'), 'export const New = () => <MagicCard />;\n');
      const again = run(app, 'setup');
      assert.equal(again.status, 0, again.stderr);
      assert.match(again.stdout, /Updated/);
      assert.match(again.stdout, /Kept your existing decree\.baseline\.json/);
      const verify = run(app, 'verify', '.', '--baseline', 'decree.baseline.json');
      assert.equal(verify.status, 1, 'a new problem added before re-running setup still fails');
      assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')).scan.localComponentPrefixes, ['src/ui']);
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });

  it('explains what to do when no design system ships a contract', () => {
    const app = mkdtempSync(join(tmpdir(), 'decree-setup-empty-'));
    try {
      writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'app', dependencies: {} }));
      const setup = run(app, 'setup');
      assert.equal(setup.status, 1);
      assert.match(setup.stderr, /Couldn't find a design system/);
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });
});
