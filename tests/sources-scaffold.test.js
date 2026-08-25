import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  existsSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  sourcesScaffoldTemplate,
  validateSources,
  writeSourcesScaffold,
} from '../src/init/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const decreeBin = join(root, 'bin/decree.js');

describe('decree sources scaffold', () => {
  it('template includes every schema key and validates', () => {
    const template = sourcesScaffoldTemplate();
    const validated = validateSources(template);
    assert.equal(validated.version, 1);
    assert.deepEqual(validated.components?.include, []);
    assert.deepEqual(validated.components?.exclude, []);
    assert.equal(validated.tokens?.mode, 'css-allowlist');
    assert.deepEqual(validated.tokens?.files, []);
    assert.deepEqual(validated.tokens?.cssAllowlist, []);
    assert.deepEqual(validated.ignoreComponentNames, []);
    assert.deepEqual(validated.nativeElementMap, {});
    assert.deepEqual(validated.deprecations?.components, {});
    assert.deepEqual(validated.deprecations?.tokens, {});
    assert.deepEqual(validated.componentApis, {});
    assert.deepEqual(validated.restyle, {
      style: false,
      sx: false,
      arbitraryClass: false,
    });
  });

  it('writes decree.sources.json and refuses overwrite without force', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-sources-'));
    const first = writeSourcesScaffold(dir);
    assert.equal(first.written, true);
    assert.ok(existsSync(first.path));
    const raw = JSON.parse(readFileSync(first.path, 'utf8'));
    assert.equal(raw.version, 1);
    assert.ok('components' in raw);
    assert.ok('tokens' in raw);
    assert.ok('ignoreComponentNames' in raw);
    assert.ok('nativeElementMap' in raw);
    assert.ok('deprecations' in raw);
    assert.deepEqual(raw.deprecations, { components: {}, tokens: {} });
    assert.ok('componentApis' in raw);
    assert.deepEqual(raw.componentApis, {});
    assert.ok('restyle' in raw);
    assert.deepEqual(raw.restyle, {
      style: false,
      sx: false,
      arbitraryClass: false,
    });

    assert.throws(
      () => writeSourcesScaffold(dir, { force: false }),
      /already exist/,
    );

    const second = writeSourcesScaffold(dir, { force: true });
    assert.equal(second.written, true);
    assert.equal(second.created, false);
  });

  it('CLI sources scaffolds and --force overwrites', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-sources-cli-'));
    const first = spawnSync(process.execPath, [decreeBin, 'sources', dir], {
      encoding: 'utf8',
    });
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /decree sources: wrote/);
    assert.match(first.stderr, /Fill components\.include/);
    assert.ok(existsSync(join(dir, 'decree.sources.json')));

    const blocked = spawnSync(process.execPath, [decreeBin, 'sources', dir], {
      encoding: 'utf8',
    });
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /already exist/);

    writeFileSync(
      join(dir, 'decree.sources.json'),
      `${JSON.stringify({ version: 1, components: { include: ['src'] } }, null, 2)}\n`,
    );
    const forced = spawnSync(
      process.execPath,
      [decreeBin, 'sources', dir, '--force'],
      { encoding: 'utf8' },
    );
    assert.equal(forced.status, 0, forced.stderr);
    const raw = JSON.parse(
      readFileSync(join(dir, 'decree.sources.json'), 'utf8'),
    );
    assert.deepEqual(raw.components.include, []);
  });
});
