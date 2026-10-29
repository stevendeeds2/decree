import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractTokens } from '../src/init/extract.js';

function packageWithTokens() {
  const root = mkdtempSync(join(tmpdir(), 'decree-modes-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@acme/ds' }));
  writeFileSync(
    join(root, 'tokens.json'),
    JSON.stringify({
      primitive: { spacing: { lg: { $value: { value: 24, unit: 'px' }, $type: 'dimension' } } },
      theme: {
        light: { surface: { fill: { $value: '#fff', $type: 'color' } } },
        dark: { surface: { fill: { $value: '#000', $type: 'color' } } },
      },
    }),
  );
  return root;
}

describe('DTCG theme modes', () => {
  it('keeps full paths only when no modes are declared', () => {
    const names = extractTokens(packageWithTokens(), { mode: 'dtcg-only' }).map((t) => t.name);
    assert.ok(names.includes('--theme-light-surface-fill'));
    assert.ok(!names.includes('--theme-surface-fill'));
  });

  it('also allows the mode-free name apps use when modes are declared', () => {
    const names = extractTokens(packageWithTokens(), {
      mode: 'dtcg-only',
      modes: ['light', 'dark'],
    }).map((t) => t.name);
    assert.ok(names.includes('--theme-light-surface-fill'));
    assert.ok(names.includes('--theme-dark-surface-fill'));
    assert.ok(names.includes('--theme-surface-fill'));
    assert.ok(names.includes('--primitive-spacing-lg'));
  });
});
