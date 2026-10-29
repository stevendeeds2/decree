import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/verify/scan.js';
import { CODES } from '../src/verify/codes.js';

const htmContract = {
  version: 1,
  components: ['Surface', 'Button'],
  tokens: [{ name: '--theme-surface-emphasis-background-color' }],
  nativeElementMap: { button: 'Button' },
  componentApis: {
    Surface: {
      props: {
        fill: { enum: ['passive', 'emphasis', 'carved'] },
        inset: { enum: ['sm', 'md', 'lg'] },
      },
    },
  },
  restyle: { style: true, sx: false, arbitraryClass: false },
};

/** @param {import('../src/verify/scan.js').Finding[]} findings @param {string} code */
const codes = (findings, code) => findings.filter((f) => f.code === code);

describe('htm tagged templates', () => {
  it('passes allowlisted components with legal props', () => {
    const source = `
import { html } from 'htm/preact';
import { Surface } from '@acme/ds';
export const Card = () => html\`
  <\${Surface} fill="emphasis" inset="lg" class="card">
    <p>Hello</p>
  <//>
\`;
`;
    const findings = scanSource(source, 'src/Card.js', htmContract);
    assert.deepEqual(findings, []);
  });

  it('flags an invented component and reports its line', () => {
    const source = `import { html } from 'htm/preact';
const MagicCard = () => null;
export const App = () => html\`
  <main>
    <\${MagicCard} />
  </main>
\`;
`;
    const [finding] = codes(scanSource(source, 'src/App.js', htmContract), CODES.UNKNOWN_COMPONENT);
    assert.ok(finding, 'expected an unknown component');
    assert.match(finding.message, /MagicCard/);
    assert.equal(finding.line, 5);
  });

  it('flags an illegal prop value written as a literal or an expression', () => {
    const source = `
export const A = () => html\`<\${Surface} fill="loud" />\`;
export const B = () => html\`<\${Surface} fill=\${'loud'} />\`;
`;
    const found = codes(scanSource(source, 'src/A.js', htmContract), CODES.INVALID_PROP_VALUE);
    assert.equal(found.length, 2, JSON.stringify(found));
  });

  it('flags an unknown prop and restyle via style=', () => {
    const source = `
export const A = () => html\`<\${Surface} glow="yes" style=\${{ padding: 4 }} />\`;
`;
    const findings = scanSource(source, 'src/A.js', htmContract);
    assert.equal(codes(findings, CODES.UNKNOWN_PROP).length, 1, JSON.stringify(findings));
    assert.equal(codes(findings, CODES.RESTYLE_STYLE).length, 1, JSON.stringify(findings));
  });

  it('ignores dynamic values and spreads it cannot know', () => {
    const source = `
export const A = (p) => html\`<\${Surface} fill=\${p.fill} ...\${p} />\`;
`;
    assert.deepEqual(scanSource(source, 'src/A.js', htmContract), []);
  });

  it('flags a raw native element the system replaces', () => {
    const source = `export const A = () => html\`<button type="button">Go</button>\`;`;
    assert.equal(codes(scanSource(source, 'src/A.js', htmContract), CODES.NATIVE_ELEMENT).length, 1);
  });

  it('does not read markup out of ordinary strings or other tagged templates', () => {
    const source = `
const doc = "<\${MagicCard}>";
const query = gql\`<MagicCard>\`;
export const A = () => html\`<p>ok</p>\`;
`;
    assert.equal(codes(scanSource(source, 'src/A.js', htmContract), CODES.UNKNOWN_COMPONENT).length, 0);
  });

  it('reads custom template tag names from the contract', () => {
    const contract = { ...htmContract, scan: { templateTags: ['ui'] } };
    const source = `export const A = () => ui\`<\${Ghost} />\`;`;
    assert.equal(codes(scanSource(source, 'src/A.js', contract), CODES.UNKNOWN_COMPONENT).length, 1);
  });
});

const litContract = {
  version: 1,
  components: ['sl-button', 'sl-card'],
  tokens: [{ name: '--sl-color-primary-600' }],
  nativeElementMap: { button: 'sl-button' },
  componentApis: {
    'sl-button': {
      props: {
        variant: { enum: ['default', 'primary', 'danger'] },
        size: { enum: ['small', 'medium', 'large'] },
        disabled: { type: 'boolean' },
      },
    },
  },
};

describe('Lit-style tagged templates', () => {
  it('passes allowlisted custom elements with legal attributes and bindings', () => {
    const source = `
import { html, LitElement } from 'lit';
class Toolbar extends LitElement {
  render() {
    return html\`
      <sl-card>
        <sl-button variant="primary" ?disabled=\${this.busy} @click=\${this.save}>Save</sl-button>
      </sl-card>
    \`;
  }
}
`;
    assert.deepEqual(scanSource(source, 'src/toolbar.ts', litContract), []);
  });

  it('flags an invented element under the system prefix', () => {
    const source = `export const t = html\`<sl-magic-button></sl-magic-button>\`;`;
    const [finding] = codes(scanSource(source, 'src/t.ts', litContract), CODES.UNKNOWN_COMPONENT);
    assert.ok(finding);
    assert.match(finding.message, /sl-magic-button/);
  });

  it('leaves third-party custom elements alone', () => {
    const source = `export const t = html\`<model-viewer src="a.glb"></model-viewer>\`;`;
    assert.deepEqual(scanSource(source, 'src/t.ts', litContract), []);
  });

  it('flags illegal attribute values on allowlisted elements', () => {
    const source = `export const t = html\`<sl-button variant="ghost">x</sl-button>\`;`;
    const [finding] = codes(scanSource(source, 'src/t.ts', litContract), CODES.INVALID_PROP_VALUE);
    assert.ok(finding);
    assert.match(finding.message, /variant="ghost"/);
  });

  it('flags hardcoded colors inside templates', () => {
    const source = 'export const t = html`<sl-card style="color: #ff0000"></sl-card>`;';
    assert.equal(codes(scanSource(source, 'src/t.ts', litContract), CODES.HARDCODED_HEX).length, 1);
  });

  it('uses scan.customElementPrefixes when the contract sets it', () => {
    const contract = { ...litContract, scan: { customElementPrefixes: ['acme-'] } };
    const source = 'export const t = html`<sl-magic></sl-magic><acme-thing></acme-thing>`;';
    const found = codes(scanSource(source, 'src/t.ts', contract), CODES.UNKNOWN_COMPONENT);
    assert.deepEqual(found.map((f) => f.message.match(/<([^>]+)>/)[1]), ['acme-thing']);
  });
});
