import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { verifyPath } from '../src/verify/index.js';
import { CODES } from '../src/verify/codes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const playgrounds = [
  {
    name: 'mui-from-npm',
    clean: join(root, 'examples/mui-from-npm/clean'),
    dirty: join(root, 'examples/mui-from-npm/dirty'),
  },
  {
    name: 'radix-from-npm',
    clean: join(root, 'examples/radix-from-npm/clean'),
    dirty: join(root, 'examples/radix-from-npm/dirty'),
  },
];

describe('npm-backed third-party examples', () => {
  for (const pg of playgrounds) {
    it(`${pg.name} clean passes`, () => {
      const result = verifyPath(pg.clean);
      assert.equal(result.ok, true, JSON.stringify(result.findings, null, 2));
    });

    it(`${pg.name} dirty fails with unknown component + color/native signals`, () => {
      const result = verifyPath(pg.dirty);
      assert.equal(result.ok, false);
      const codes = new Set(result.findings.map((f) => f.code));
      assert.ok(codes.has(CODES.UNKNOWN_COMPONENT), `${pg.name}: unknown component`);
      assert.ok(
        codes.has(CODES.HARDCODED_HEX) || codes.has(CODES.HARDCODED_COLOR),
        `${pg.name}: hardcoded color`,
      );
      assert.ok(codes.has(CODES.NATIVE_ELEMENT), `${pg.name}: native element`);
    });
  }
});
