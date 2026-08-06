import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/verify/scan.js';
import { CODES } from '../src/verify/codes.js';

describe('positive token enforcement', () => {
  const withTokens = {
    version: 1,
    components: ['Button'],
    tokens: [{ name: '--primary' }, { name: '--spacing-2' }],
    nativeElementMap: {},
  };

  it('flags var(--unknown) when contract has tokens', () => {
    const source = `
export function App() {
  return <Button style={{ color: 'var(--not-real)' }}>x</Button>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', withTokens);
    assert.ok(
      findings.some(
        (f) =>
          f.code === CODES.UNKNOWN_TOKEN && /--not-real/.test(f.message),
      ),
      JSON.stringify(findings),
    );
  });

  it('allows var(--primary) when listed on the contract', () => {
    const source = `
export function App() {
  return <Button style={{ color: 'var(--primary)' }}>x</Button>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', withTokens);
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_TOKEN).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('skips positive checks when tokens array is empty', () => {
    const source = `
export function App() {
  return <Button style={{ color: 'var(--mui-palette-primary-main)' }}>x</Button>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', {
      version: 1,
      components: ['Button'],
      tokens: [],
      nativeElementMap: {},
    });
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_TOKEN).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('flags unknown tokens in CSS files', () => {
    const findings = scanSource(
      `.x { color: var(--missing); background: var(--primary); }\n`,
      'src/a.css',
      withTokens,
    );
    assert.ok(findings.some((f) => /--missing/.test(f.message)));
    assert.ok(!findings.some((f) => /--primary/.test(f.message) && f.code === CODES.UNKNOWN_TOKEN));
  });
});
