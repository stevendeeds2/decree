import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/verify/scan.js';

describe('findings from the React blind test', () => {
  const contract = {
    version: 1,
    components: ['Button', 'Card'],
    tokens: [],
    nativeElementMap: {},
    componentApis: { Button: { props: { variant: { enum: ['primary', 'secondary'] } } } },
  };
  const codesOf = (source) => scanSource(source, 'src/A.jsx', contract).map((f) => f.code);

  it('does not flag standard HTML attributes a component forwards', () => {
    assert.deepEqual(
      codesOf('export const A = () => <Button variant="primary" type="submit" disabled>Go</Button>;'),
      [],
    );
  });

  it('still lists the allowed props when a prop is unknown', () => {
    const [f] = scanSource('export const A = () => <Button glow>Go</Button>;', 'src/A.jsx', contract);
    assert.match(f.message, /Its props are: variant/);
  });

  it('checks each literal branch of a conditional value', () => {
    assert.deepEqual(
      codesOf('export const A = ({ busy }) => <Button variant={busy ? "ghost" : "primary"}>Go</Button>;'),
      ['DECREE_INVALID_PROP_VALUE'],
    );
  });

  it('resolves <UI.Button> from a namespace import', () => {
    const source = `import * as UI from '@acme/ui';
export const A = () => <UI.Button variant="ghost">Go</UI.Button>;`;
    const findings = scanSource(source, 'src/A.jsx', contract);
    assert.deepEqual(findings.map((f) => f.code), ['DECREE_INVALID_PROP_VALUE']);
    assert.match(findings[0].message, /<Button>/);
  });
});
