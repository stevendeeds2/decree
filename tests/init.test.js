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
  writeContract,
  resolvePackageRoot,
} from '../src/init/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const samplePkg = join(root, 'fixtures/init-sample-pkg');
const decreeBin = join(root, 'bin/decree.js');

describe('decree init', () => {
  it('builds a valid contract from the sample package', () => {
    const contract = buildContractFromPackage(samplePkg);
    validateContract(contract);
    assert.equal(contract.version, 1);
    assert.equal(contract.package, '@fixtures/init-sample-pkg');
    assert.ok(contract.components.includes('Button'));
    assert.ok(contract.components.includes('Input'));
    assert.ok(!contract.components.includes('formatLabel'));
    assert.ok(contract.tokens.some((t) => t.name === '--background'));
    assert.ok(contract.tokens.some((t) => t.name === '--primary'));
    assert.ok(
      contract.tokens.some((t) => t.name === '--theme-control-emphasis-background'),
    );
    assert.equal(contract.nativeElementMap.button, 'Button');
    assert.equal(contract.nativeElementMap.input, 'Input');
  });

  it('resolves a package directory path', () => {
    assert.equal(resolvePackageRoot(samplePkg, root), samplePkg);
  });

  it('writes decree.contract.json and refuses overwrite without force', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-init-'));
    try {
      const out = join(dir, 'decree.contract.json');
      const first = writeContract(buildContractFromPackage(samplePkg), out, {
        force: false,
      });
      assert.equal(first.written, true);
      assert.ok(existsSync(out));
      validateContract(JSON.parse(readFileSync(out, 'utf8')));

      assert.throws(
        () =>
          writeContract(buildContractFromPackage(samplePkg), out, {
            force: false,
          }),
        /exists/i,
      );

      const second = writeContract(buildContractFromPackage(samplePkg), out, {
        force: true,
      });
      assert.equal(second.written, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CLI init writes a contract for the sample package', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-init-cli-'));
    try {
      const out = join(dir, 'decree.contract.json');
      const result = spawnSync(
        process.execPath,
        [decreeBin, 'init', samplePkg, '--out', out],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.ok(existsSync(out));
      validateContract(JSON.parse(readFileSync(out, 'utf8')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolves package name from node_modules', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-init-nm-'));
    try {
      const nm = join(dir, 'node_modules', '@fixtures', 'init-sample-pkg');
      mkdirSync(nm, { recursive: true });
      // symlink-style copy: point package.json + minimal tree via nested copy of fixture files
      writeFileSync(
        join(nm, 'package.json'),
        readFileSync(join(samplePkg, 'package.json')),
      );
      mkdirSync(join(nm, 'js', 'components'), { recursive: true });
      mkdirSync(join(nm, 'styles'), { recursive: true });
      for (const rel of [
        'js/components/Button.js',
        'js/components/Input.js',
        'js/components/helpers.js',
        'styles/tokens.css',
        'tokens.json',
      ]) {
        writeFileSync(join(nm, rel), readFileSync(join(samplePkg, rel)));
      }

      const resolved = resolvePackageRoot('@fixtures/init-sample-pkg', dir);
      assert.equal(resolved, nm);
      const contract = buildContractFromPackage(resolved);
      assert.ok(contract.components.includes('Button'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
