import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyPath } from '../src/verify/index.js';
import { resolveExcludePrefixes } from '../src/verify/excludes.js';
import { validateContract } from '../src/contract/index.js';
import { collectImportAliases } from '../src/verify/imports.js';
import { CODES } from '../src/verify/codes.js';

describe('resolveExcludePrefixes', () => {
  it('merges defaults with custom prefixes', () => {
    const resolved = resolveExcludePrefixes({
      excludePrefixes: ['src/vendor'],
    });
    assert.ok(resolved.includes('src/components/ui'));
    assert.ok(resolved.includes('src/styles/themes'));
    assert.ok(resolved.includes('src/vendor'));
  });

  it('can disable defaults', () => {
    const resolved = resolveExcludePrefixes({
      excludeDefaults: false,
      excludePrefixes: ['src/vendor'],
    });
    assert.deepEqual(resolved, ['src/vendor']);
  });
});

describe('default excludes in verifyPath', () => {
  /** @type {string} */
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'decree-excludes-'));
    mkdirSync(join(root, 'src/components/ui'), { recursive: true });
    mkdirSync(join(root, 'src/app'), { recursive: true });
    writeFileSync(
      join(root, 'decree.contract.json'),
      JSON.stringify({
        version: 1,
        components: ['Button'],
        tokens: [],
        nativeElementMap: {},
      }),
    );
    writeFileSync(
      join(root, 'src/components/ui/button.tsx'),
      `export function Button() { return <button className="bg-[#ff0000]" />; }\n`,
    );
    writeFileSync(
      join(root, 'src/app/page.tsx'),
      `export default function Page() { return <Button>Ok</Button>; }\n`,
    );
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('skips src/components/ui by default without explicit excludePrefixes', () => {
    const result = verifyPath(root);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });
});

describe('safe scan prefixes', () => {
  it('rejects path-escaping localComponentPrefixes', () => {
    assert.throws(
      () =>
        validateContract({
          version: 1,
          components: ['Button'],
          tokens: [],
          nativeElementMap: {},
          scan: { profile: 'app', localComponentPrefixes: ['../outside'] },
        }),
      /\.\.|prefix|safe/i,
    );
  });

  it('rejects path-escaping excludePrefixes', () => {
    assert.throws(
      () =>
        validateContract({
          version: 1,
          components: ['Button'],
          tokens: [],
          nativeElementMap: {},
          scan: { excludePrefixes: ['/etc'] },
        }),
      /prefix|safe|absolute/i,
    );
  });
});

describe('type-only import aliases', () => {
  it('does not map import { type X as Y }', () => {
    const map = collectImportAliases(
      `import { type Link as MaterialUILink } from '@mui/material';\n`,
    );
    assert.equal(map.has('MaterialUILink'), false);
  });
});

describe('escaping local prefixes cannot allow outside components', () => {
  /** @type {string} */
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'decree-escape-'));
    mkdirSync(join(root, 'src/app'), { recursive: true });
    // Contract with escaping prefix must fail validation at load time
    writeFileSync(
      join(root, 'decree.contract.json'),
      JSON.stringify({
        version: 1,
        components: ['Button'],
        tokens: [],
        nativeElementMap: {},
        scan: {
          profile: 'app',
          localComponentPrefixes: ['../outside'],
          excludeDefaults: false,
        },
      }),
    );
    writeFileSync(
      join(root, 'src/app/page.tsx'),
      `export default function Page() { return <EvilShell />; }\n`,
    );
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('fails closed with INVALID_CONTRACT', () => {
    const result = verifyPath(root);
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, 2);
    assert.ok(
      result.findings.some((f) => f.code === CODES.INVALID_CONTRACT),
      JSON.stringify(result.findings),
    );
  });
});
