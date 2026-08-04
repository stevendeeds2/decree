import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/verify/scan.js';
import { CODES } from '../src/verify/codes.js';

const contract = {
  version: 1,
  components: ['Button', 'Card'],
  tokens: [{ name: '--primary' }],
  nativeElementMap: { button: 'Button' },
};

describe('richer decree scanners', () => {
  it('flags unknown PascalCase JSX components not on the allowlist', () => {
    const findings = scanSource(
      `export function App() { return <SuperButton>Go</SuperButton>; }\n`,
      'src/App.tsx',
      contract,
    );
    const codes = findings.map((f) => f.code);
    assert.ok(codes.includes(CODES.UNKNOWN_COMPONENT), JSON.stringify(findings));
    assert.ok(findings.some((f) => /SuperButton/.test(f.message)));
  });

  it('does not flag allowlisted components or lowercase intrinsics', () => {
    const findings = scanSource(
      `export function App() {\n  return (\n    <Card><Button>Ok</Button><div>x</div></Card>\n  );\n}\n`,
      'src/App.tsx',
      contract,
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('flags rgb/hsl colors as hardcoded color bypasses', () => {
    const findings = scanSource(
      `const s = { color: 'rgb(255, 0, 0)', bg: 'hsl(210 40% 98%)' };\n`,
      'src/styles.ts',
      contract,
    );
    const colorFindings = findings.filter((f) => f.code === CODES.HARDCODED_COLOR);
    assert.ok(colorFindings.length >= 2, JSON.stringify(findings));
  });

  it('flags hex inside template literals (CSS-in-JS)', () => {
    const findings = scanSource(
      'const css = `color: #ff00aa; padding: 8px`;\n',
      'src/styled.ts',
      contract,
    );
    assert.ok(
      findings.some((f) => f.code === CODES.HARDCODED_HEX && /#ff00aa/.test(f.message)),
      JSON.stringify(findings),
    );
  });
});
