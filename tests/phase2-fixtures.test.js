import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { verifyPath } from '../src/verify/index.js';
import { CODES } from '../src/verify/codes.js';
import { listPrimitives, listTokens } from '../src/mcp/allowlist.js';
import { loadContract } from '../src/contract/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Third-party proof systems only — no personal production DS. */
const systems = [
  {
    name: 'mui',
    clean: join(root, 'fixtures/mui-clean'),
    dirty: join(root, 'fixtures/mui-dirty'),
    expectPrimitive: 'Button',
    expectToken: '--mui-palette-primary-main',
  },
  {
    name: 'radix-themes',
    clean: join(root, 'examples/radix-themes-clean'),
    dirty: join(root, 'examples/radix-themes-dirty'),
    expectPrimitive: 'Button',
    expectToken: '--accent-9',
  },
];

describe('third-party proof fixtures', () => {
  for (const sys of systems) {
    it(`${sys.name} clean passes verify`, () => {
      const result = verifyPath(sys.clean);
      assert.equal(result.ok, true, JSON.stringify(result.findings, null, 2));
    });

    it(`${sys.name} dirty fails with stable codes`, () => {
      const result = verifyPath(sys.dirty);
      assert.equal(result.ok, false);
      const codes = new Set(result.findings.map((f) => f.code));
      assert.ok(codes.has(CODES.NATIVE_ELEMENT), `${sys.name}: native element`);
      assert.ok(codes.has(CODES.HARDCODED_HEX), `${sys.name}: hardcoded hex`);
    });

    it(`${sys.name} MCP allowlist exposes real primitives/tokens only`, () => {
      const contract = loadContract(join(sys.clean, 'decree.contract.json'));
      const primitives = listPrimitives(contract).map((p) => p.name);
      const tokens = listTokens(contract).map((t) => t.name);
      assert.ok(primitives.includes(sys.expectPrimitive));
      assert.ok(!primitives.includes('SuperButton'));
      assert.ok(tokens.includes(sys.expectToken));
      assert.ok(!tokens.includes('#ff00aa'));
    });
  }
});
