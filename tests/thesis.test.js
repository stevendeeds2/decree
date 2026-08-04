import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('Decree product docs', () => {
  it('README states the enforcement pitch', () => {
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    assert.match(readme, /enforcement layer/i);
    assert.match(readme, /If it’s not in the system, it doesn’t ship/i);
  });

  it('THESIS names non-goals and POC success criteria', () => {
    const thesis = readFileSync(join(root, 'docs/THESIS.md'), 'utf8');
    assert.match(thesis, /Not a design tool/);
    assert.match(thesis, /Invented component/);
    assert.match(thesis, /Hardcoded color/);
  });

  it('POC centers shadcn clean/dirty fixtures', () => {
    const poc = readFileSync(join(root, 'docs/POC.md'), 'utf8');
    assert.match(poc, /shadcn/i);
    assert.match(poc, /Fixture A — clean/);
    assert.match(poc, /Fixture B — contaminated/);
  });
});
