import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('together prototype', () => {
  it('Specs 2 + DS Contracts compile a judge slice; clean passes; dirty fails', () => {
    const result = spawnSync(
      process.execPath,
      [join(root, 'demos/together/prove.mjs')],
      { encoding: 'utf8', cwd: root },
    );
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /together: PASS/);
  });
});
