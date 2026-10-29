import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractComponents, inferNativeElementMap } from '../src/init/extract.js';

function pkg(files) {
  const root = mkdtempSync(join(tmpdir(), 'decree-extract-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@acme/ds' }));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  return root;
}

describe('prepare finds components beyond JSX', () => {
  it('names Vue and Svelte single-file components by their file', () => {
    const root = pkg({
      'src/components/AcmeButton.vue': '<template><button><slot /></button></template>',
      'src/components/acme-card.vue': '<template><div /></template>',
      'src/components/Badge.svelte': '<span><slot /></span>',
    });
    assert.deepEqual(extractComponents(root), ['AcmeButton', 'AcmeCard', 'Badge']);
  });

  it('reads custom-element tag names from Lit and plain web components', () => {
    const root = pkg({
      'src/components/acme-button.js':
        "import { LitElement } from 'lit';\nexport class AcmeButton extends LitElement {}\ncustomElements.define('acme-button', AcmeButton);\n",
      'src/components/acme-card.ts':
        "import { customElement } from 'lit/decorators.js';\n@customElement('acme-card')\nexport class AcmeCard extends LitElement {}\n",
    });
    const names = extractComponents(root);
    assert.ok(names.includes('acme-button'), names.join(','));
    assert.ok(names.includes('acme-card'), names.join(','));
  });
});

describe('native element map', () => {
  it('maps prefixed components when there is exactly one', () => {
    assert.deepEqual(inferNativeElementMap(['AcmeButton', 'AcmeCard', 'AcmeInput']), {
      button: 'AcmeButton',
      input: 'AcmeInput',
    });
    assert.deepEqual(inferNativeElementMap(['acme-button', 'acme-card']), { button: 'acme-button' });
  });

  it('prefers an exact name and does not guess between two', () => {
    assert.deepEqual(inferNativeElementMap(['Button', 'IconButton']), { button: 'Button' });
    assert.deepEqual(inferNativeElementMap(['IconButton', 'SplitButton']), {});
  });

  it('keeps the first component for a shared native tag', () => {
    assert.equal(inferNativeElementMap(['Input', 'Checkbox', 'Radio']).input, 'Input');
  });
});
