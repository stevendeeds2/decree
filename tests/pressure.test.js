import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPath } from '../src/verify/index.js';
import { scanSource } from '../src/verify/scan.js';
import {
  validateSnippet,
  isAllowedPrimitive,
} from '../src/mcp/allowlist.js';
import { loadContract } from '../src/contract/index.js';
import { collectLocalComponents } from '../src/verify/local-components.js';
import { resolveExcludePrefixes } from '../src/verify/excludes.js';
import { CODES } from '../src/verify/codes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const adversarial = join(root, 'fixtures/pressure-adversarial');

describe('pressure: adversarial fixture', () => {
  it('fails verify with the expected forgery / bypass codes', () => {
    const result = verifyPath(adversarial);
    assert.equal(result.ok, false);
    const codes = new Set(result.findings.map((f) => f.code));
    assert.ok(codes.has(CODES.UNKNOWN_COMPONENT), JSON.stringify([...codes]));
    assert.ok(codes.has(CODES.HARDCODED_HEX), JSON.stringify([...codes]));
    assert.ok(codes.has(CODES.HARDCODED_COLOR), JSON.stringify([...codes]));
    assert.ok(codes.has(CODES.ARBITRARY_VALUE), JSON.stringify([...codes]));
    assert.ok(codes.has(CODES.NATIVE_ELEMENT), JSON.stringify([...codes]));
    // Bare Link / ThemeProvider must not silent-pass
    assert.ok(
      result.findings.some((f) => /<Link>/.test(f.message)),
      'bare Link must fail',
    );
    assert.ok(
      result.findings.some((f) => /ThemeProvider/.test(f.message)),
      'bare ThemeProvider must fail',
    );
    // Local Shell under profile:app must not be unknown
    assert.ok(
      !result.findings.some(
        (f) =>
          f.code === CODES.UNKNOWN_COMPONENT && /<Shell>/.test(f.message),
      ),
      'local Shell should be allowed',
    );
  });
});

describe('pressure: MCP ↔ verify parity (profile app)', () => {
  it('validate_snippet honors preloaded localComponents like verifyPath', () => {
    const contract = loadContract(join(adversarial, 'decree.contract.json'));
    const excludes = resolveExcludePrefixes(contract.scan || {});
    const locals = collectLocalComponents(
      adversarial,
      contract.scan?.localComponentPrefixes || ['src/components'],
      excludes,
    );
    assert.ok(locals.has('Shell'));

    const withLocals = validateSnippet(
      contract,
      `export function A() { return <Shell><Button>x</Button></Shell>; }\n`,
      'snippet.tsx',
      { localComponents: locals },
    );
    assert.equal(withLocals.ok, true, JSON.stringify(withLocals.findings));

    const withoutLocals = validateSnippet(
      contract,
      `export function A() { return <Shell><Button>x</Button></Shell>; }\n`,
      'snippet.tsx',
    );
    assert.equal(withoutLocals.ok, false, 'strict snippet must flag Shell');
  });

  it('isAllowedPrimitive can consult local set for agents', () => {
    const contract = loadContract(join(adversarial, 'decree.contract.json'));
    assert.equal(isAllowedPrimitive(contract, 'Shell'), false);
    assert.equal(
      isAllowedPrimitive(contract, 'Shell', { localComponents: new Set(['Shell']) }),
      true,
    );
    assert.equal(isAllowedPrimitive(contract, 'SuperButton', {
      localComponents: new Set(['Shell']),
    }), false);
  });
});

describe('pressure: scanner edge cases', () => {
  const contract = {
    version: 1,
    components: ['Button'],
    tokens: [],
    nativeElementMap: {},
  };

  it('does not treat URL fragments as hardcoded hex', () => {
    const findings = scanSource(
      `const href = "https://example.com/docs#intro";\nconst a = "https://x.com/#fff";\n`,
      'src/a.ts',
      contract,
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.HARDCODED_HEX).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('still flags real hex colors', () => {
    const findings = scanSource(
      `const s = { color: '#ff00aa' };\n`,
      'src/a.ts',
      contract,
    );
    assert.ok(findings.some((f) => f.code === CODES.HARDCODED_HEX));
  });

  it('rejects oversized snippets in validate_snippet', () => {
    const big = `export const X = () => <Button>${'x'.repeat(600_000)}</Button>;\n`;
    const result = validateSnippet(contract, big);
    assert.equal(result.ok, false);
    assert.ok(
      result.findings.some((f) => f.code === CODES.SNIPPET_TOO_LARGE),
      JSON.stringify(result.findings),
    );
  });
});
