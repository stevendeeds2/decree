import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyPath } from '../src/verify/index.js';
import { CODES } from '../src/verify/codes.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clean = join(root, 'fixtures/shadcn-clean');
const dirty = join(root, 'fixtures/shadcn-dirty');

describe('decree verify', () => {
  it('passes the clean shadcn fixture', () => {
    const result = verifyPath(clean);
    assert.equal(result.ok, true);
    assert.equal(result.findings.length, 0);
    assert.equal(result.exitCode, 0);
  });

  it('fails the dirty shadcn fixture with stable codes', () => {
    const result = verifyPath(dirty);
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, 1);

    const codes = new Set(result.findings.map((f) => f.code));
    assert.ok(codes.has(CODES.NATIVE_ELEMENT), 'expected native element finding');
    assert.ok(codes.has(CODES.HARDCODED_HEX), 'expected hardcoded hex finding');
    assert.ok(codes.has(CODES.ARBITRARY_VALUE), 'expected arbitrary value finding');
  });

  it('skips *.test.* source files (dogfood: tests are not shipping UI)', () => {
    const fixture = join(root, 'fixtures/verify-skip-tests');
    const result = verifyPath(fixture);
    assert.equal(result.ok, true, JSON.stringify(result.findings, null, 2));
    assert.equal(result.filesScanned, 1);
  });
});
