import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  fingerprintFinding,
  normalizeMessage,
  diffAgainstBaseline,
  loadBaseline,
  writeBaseline,
  findingsToBaseline,
} from '../src/verify/baseline.js';
import { verifyPath } from '../src/verify/index.js';

describe('baseline fingerprints', () => {
  it('normalizes whitespace in messages', () => {
    assert.equal(normalizeMessage('  Hardcoded   color  #fff  '), 'Hardcoded color #fff');
  });

  it('same code+file+message → same fingerprint ignoring line', () => {
    const a = fingerprintFinding({
      code: 'DECREE_HARDCODED_HEX',
      file: 'a.ts',
      line: 1,
      message: 'Hardcoded color #fff — use a contract token instead',
    });
    const b = fingerprintFinding({
      code: 'DECREE_HARDCODED_HEX',
      file: 'a.ts',
      line: 99,
      message: 'Hardcoded color #fff — use a contract token instead',
    });
    assert.equal(a, b);
  });

  it('different file → different fingerprint', () => {
    const a = fingerprintFinding({
      code: 'DECREE_HARDCODED_HEX',
      file: 'a.ts',
      line: 1,
      message: 'Hardcoded color #fff',
    });
    const b = fingerprintFinding({
      code: 'DECREE_HARDCODED_HEX',
      file: 'b.ts',
      line: 1,
      message: 'Hardcoded color #fff',
    });
    assert.notEqual(a, b);
  });
});

describe('diffAgainstBaseline', () => {
  it('marks only unseen findings as new', () => {
    const f1 = {
      code: 'DECREE_HARDCODED_HEX',
      file: 'a.ts',
      line: 1,
      message: 'Hardcoded color #fff',
    };
    const f2 = {
      code: 'DECREE_UNKNOWN_COMPONENT',
      file: 'a.ts',
      line: 2,
      message: 'Unknown component <X>',
    };
    const baseline = findingsToBaseline([f1]);
    const { newFindings, baselinedFindings } = diffAgainstBaseline(
      [f1, f2],
      baseline,
    );
    assert.equal(baselinedFindings.length, 1);
    assert.equal(newFindings.length, 1);
    assert.equal(newFindings[0].code, 'DECREE_UNKNOWN_COMPONENT');
  });
});

describe('verifyPath baseline modes', () => {
  /** @type {string} */
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'decree-baseline-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(
      join(root, 'decree.contract.json'),
      JSON.stringify({
        version: 1,
        components: ['Button'],
        tokens: [],
        nativeElementMap: { button: 'Button' },
      }),
    );
    // Two planted findings: hex + native
    writeFileSync(
      join(root, 'src', 'App.tsx'),
      `export function App() {\n  return <button style={{ color: '#ff00aa' }}>x</button>;\n}\n`,
    );
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('absolute mode still fails on all findings', () => {
    const result = verifyPath(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.length >= 2);
  });

  it('write-baseline then baseline → ok with zero new', () => {
    const baselinePath = join(root, 'decree.baseline.json');
    const written = verifyPath(root, { writeBaselinePath: baselinePath });
    assert.equal(written.exitCode, 0);
    assert.ok(existsJson(baselinePath));

    const gated = verifyPath(root, { baselinePath });
    assert.equal(gated.ok, true);
    assert.equal(gated.exitCode, 0);
    assert.equal(gated.newCount, 0);
    assert.ok(gated.baselinedCount >= 2);
  });

  it('baseline with only one finding → one new', () => {
    const absolute = verifyPath(root);
    const one = findingsToBaseline([absolute.findings[0]]);
    const baselinePath = join(root, 'partial.baseline.json');
    writeBaseline(baselinePath, one);

    const gated = verifyPath(root, { baselinePath });
    assert.equal(gated.ok, false);
    assert.equal(gated.exitCode, 1);
    assert.equal(gated.newCount, absolute.findings.length - 1);
    assert.equal(gated.baselinedCount, 1);
  });

  it('max-new 0 without baseline fails if any findings', () => {
    const gated = verifyPath(root, { maxNew: 0 });
    assert.equal(gated.ok, false);
    assert.equal(gated.newCount, gated.findings.length);
  });

  it('max-new high enough with baseline passes', () => {
    const absolute = verifyPath(root);
    const one = findingsToBaseline([absolute.findings[0]]);
    const baselinePath = join(root, 'partial2.baseline.json');
    writeBaseline(baselinePath, one);
    const gated = verifyPath(root, {
      baselinePath,
      maxNew: 100,
    });
    assert.equal(gated.ok, true);
    assert.ok(gated.newCount >= 1);
  });
});

/** @param {string} p */
function existsJson(p) {
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  return raw.version === 1 && Array.isArray(raw.findings);
}
