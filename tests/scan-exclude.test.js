import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyPath } from '../src/verify/index.js';

describe('verify scan.excludePrefixes', () => {
  it('skips paths under configured prefixes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-exclude-'));
    try {
      mkdirSync(join(dir, 'src', 'app'), { recursive: true });
      mkdirSync(join(dir, 'src', 'components', 'ui'), { recursive: true });
      writeFileSync(
        join(dir, 'decree.contract.json'),
        JSON.stringify({
          version: 1,
          components: ['Button'],
          tokens: [],
          nativeElementMap: { button: 'Button' },
          scan: { excludePrefixes: ['src/components/ui'] },
        }),
      );
      writeFileSync(
        join(dir, 'src', 'app', 'page.tsx'),
        'export function Page() { return <Button>Ok</Button>; }\n',
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'evil.tsx'),
        'export function X() { return <button>nope</button>; }\n',
      );
      const result = verifyPath(dir);
      assert.equal(result.ok, true, JSON.stringify(result.findings));
      assert.equal(result.filesScanned, 1);

    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
