import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateContract } from '../src/contract/index.js';
import {
  buildContractFromPackage,
  preparePackage,
  usePackageContract,
} from '../src/init/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcesPkg = join(root, 'tests/support/sources-bound-pkg');
const decreeBin = join(root, 'bin/decree.js');

describe('source-bound contracts', () => {
  it('excludes App and --tw-* when decree.sources.json is present', () => {
    const { contract, legacy, sourcesPath } =
      buildContractFromPackage(sourcesPkg);
    assert.equal(legacy, false);
    assert.ok(sourcesPath);
    validateContract(contract);
    assert.ok(contract.components.includes('Button'));
    assert.ok(contract.components.includes('Input'));
    assert.ok(!contract.components.includes('App'));
    assert.ok(contract.tokens.some((t) => t.name === '--background'));
    assert.ok(contract.tokens.some((t) => t.name === '--primary'));
    assert.ok(
      !contract.tokens.some((t) => t.name.startsWith('--tw-')),
      JSON.stringify(contract.tokens),
    );
  });

  it('legacy full scan still finds noise without sources', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-legacy-noise-'));
    try {
      mkdirSync(join(dir, 'src', 'components', 'ui'), { recursive: true });
      mkdirSync(join(dir, 'styles'), { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'noisy', version: '1.0.0', type: 'module' }),
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'button.tsx'),
        'export function Button() { return null }\n',
      );
      writeFileSync(
        join(dir, 'src', 'App.tsx'),
        'export function App() { return null }\n',
      );
      writeFileSync(
        join(dir, 'styles', 'x.css'),
        ':root { --background: #fff; --tw-shadow: 0; }\n',
      );
      const { contract, legacy } = buildContractFromPackage(dir);
      assert.equal(legacy, true);
      assert.ok(contract.components.includes('App'));
      assert.ok(contract.tokens.some((t) => t.name === '--tw-shadow'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('prepare writes contract and --check detects drift', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-prepare-'));
    try {
      // copy fixture tree lightly
      mkdirSync(join(dir, 'src', 'components', 'ui'), { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        readFileSync(join(sourcesPkg, 'package.json')),
      );
      writeFileSync(
        join(dir, 'decree.sources.json'),
        readFileSync(join(sourcesPkg, 'decree.sources.json')),
      );
      writeFileSync(
        join(dir, 'tokens.json'),
        readFileSync(join(sourcesPkg, 'tokens.json')),
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'button.tsx'),
        readFileSync(join(sourcesPkg, 'src/components/ui/button.tsx')),
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'input.tsx'),
        readFileSync(join(sourcesPkg, 'src/components/ui/input.tsx')),
      );

      const written = preparePackage(dir, { force: true });
      assert.equal(written.ok, true);
      assert.ok(existsSync(join(dir, 'decree.contract.json')));

      const checkOk = preparePackage(dir, { check: true });
      assert.equal(checkOk.ok, true);

      const contractPath = join(dir, 'decree.contract.json');
      const drifted = JSON.parse(readFileSync(contractPath, 'utf8'));
      drifted.components.push('Invented');
      writeFileSync(contractPath, `${JSON.stringify(drifted, null, 2)}\n`);

      const checkBad = preparePackage(dir, { check: true });
      assert.equal(checkBad.ok, false);
      assert.match(checkBad.message, /drift/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('use copies published contract into consumer cwd', () => {
    const ds = mkdtempSync(join(tmpdir(), 'decree-use-ds-'));
    const app = mkdtempSync(join(tmpdir(), 'decree-use-app-'));
    try {
      mkdirSync(join(ds, 'src', 'components', 'ui'), { recursive: true });
      writeFileSync(
        join(ds, 'package.json'),
        JSON.stringify({
          name: '@fixtures/use-ds',
          version: '1.0.0',
          type: 'module',
          decree: './decree.contract.json',
        }),
      );
      writeFileSync(
        join(ds, 'decree.sources.json'),
        readFileSync(join(sourcesPkg, 'decree.sources.json')),
      );
      writeFileSync(
        join(ds, 'tokens.json'),
        readFileSync(join(sourcesPkg, 'tokens.json')),
      );
      writeFileSync(
        join(ds, 'src', 'components', 'ui', 'button.tsx'),
        'export function Button() { return null }\n',
      );
      writeFileSync(
        join(ds, 'src', 'components', 'ui', 'input.tsx'),
        'export function Input() { return null }\n',
      );
      preparePackage(ds, { force: true });

      const result = usePackageContract(ds, app, { force: true });
      assert.ok(existsSync(join(app, 'decree.contract.json')));
      const copied = JSON.parse(
        readFileSync(join(app, 'decree.contract.json'), 'utf8'),
      );
      validateContract(copied);
      assert.ok(copied.components.includes('Button'));
      assert.equal(result.from, join(ds, 'decree.contract.json'));
    } finally {
      rmSync(ds, { recursive: true, force: true });
      rmSync(app, { recursive: true, force: true });
    }
  });

  it('CLI prepare and use work end-to-end', () => {
    const result = spawnSync(
      process.execPath,
      [decreeBin, 'prepare', sourcesPkg],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.ok(existsSync(join(sourcesPkg, 'decree.contract.json')));

    const check = spawnSync(
      process.execPath,
      [decreeBin, 'prepare', sourcesPkg, '--check'],
      { encoding: 'utf8' },
    );
    assert.equal(check.status, 0, check.stderr + check.stdout);

    const app = mkdtempSync(join(tmpdir(), 'decree-cli-use-'));
    try {
      const use = spawnSync(
        process.execPath,
        [decreeBin, 'use', sourcesPkg, '--force', '--out', join(app, 'decree.contract.json')],
        { encoding: 'utf8', cwd: app },
      );
      assert.equal(use.status, 0, use.stderr + use.stdout);
      assert.ok(existsSync(join(app, 'decree.contract.json')));
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });
});
