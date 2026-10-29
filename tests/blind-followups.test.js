import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanSource } from '../src/verify/scan.js';
import { writeSourcesScaffold } from '../src/init/sources.js';
import { CODES } from '../src/verify/codes.js';

const contract = {
  version: 1,
  components: ['AcmeCard', 'acme-button'],
  tokens: [{ name: '--acme-color-text' }],
  nativeElementMap: {},
};

describe('findings from the Vue and Lit blind tests', () => {
  it('leaves Vue built-in components alone', () => {
    const source = `<template>
  <Transition><KeepAlive><AcmeCard /></KeepAlive></Transition>
  <Teleport to="body"><transition-group><AcmeCard /></transition-group></Teleport>
</template>`;
    assert.deepEqual(scanSource(source, 'src/View.vue', contract), []);
  });

  it('reads templates when html is imported under another name', () => {
    const source = `import { html as h } from 'lit';
export const t = h\`<acme-fancy-card></acme-fancy-card>\`;`;
    const codes = scanSource(source, 'src/t.js', contract).map((f) => f.code);
    assert.deepEqual(codes, [CODES.UNKNOWN_COMPONENT]);
  });

  it('allows common attributes on custom elements', () => {
    const withApi = {
      ...contract,
      componentApis: { 'acme-button': { props: { variant: { enum: ['primary'] } } } },
    };
    const source =
      'export const t = html`<acme-button variant="primary" slot="end" part="b" title="x" hidden tabindex="0"></acme-button>`;';
    assert.deepEqual(scanSource(source, 'src/t.js', withApi), []);
  });

  it('flags named colors on color properties in CSS and style objects', () => {
    const css = scanSource('.a { color: white; background: transparent; border: 1px solid red; }', 'src/a.css', contract);
    assert.deepEqual(css.map((f) => f.subject), ['white', 'red']);
    const js = scanSource("export const s = { backgroundColor: 'tomato', whiteSpace: 'nowrap' };", 'src/s.js', contract);
    assert.deepEqual(js.map((f) => f.subject), ['tomato']);
  });
});

describe('decree sources fills in the obvious', () => {
  it('points at the components folder and tokens.json when they exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'decree-scaffold-'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@acme/ds' }));
    mkdirSync(join(root, 'src', 'components'), { recursive: true });
    writeFileSync(join(root, 'tokens.json'), '{}');
    writeSourcesScaffold(root);
    const sources = JSON.parse(readFileSync(join(root, 'decree.sources.json'), 'utf8'));
    assert.deepEqual(sources.components.include, ['src/components']);
    assert.equal(sources.tokens.mode, 'dtcg-only');
    assert.deepEqual(sources.tokens.files, ['tokens.json']);
  });
});
