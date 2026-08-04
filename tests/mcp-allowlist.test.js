import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadContract } from '../src/contract/index.js';
import {
  listPrimitives,
  listTokens,
  isAllowedPrimitive,
  validateSnippet,
} from '../src/mcp/allowlist.js';
import { CODES } from '../src/verify/codes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contract = loadContract(
  join(root, 'fixtures/shadcn-clean/decree.contract.json'),
);

describe('decree MCP allowlist', () => {
  it('list_primitives returns only contract components', () => {
    const primitives = listPrimitives(contract);
    assert.deepEqual(
      primitives.map((p) => p.name).sort(),
      [...contract.components].sort(),
    );
    assert.ok(!primitives.some((p) => p.name === 'SuperButton'));
    assert.ok(!primitives.some((p) => p.name === 'button'));
  });

  it('list_tokens returns only contract tokens', () => {
    const tokens = listTokens(contract);
    const names = tokens.map((t) => t.name);
    assert.ok(names.includes('--background'));
    assert.ok(names.includes('--primary'));
    assert.ok(!names.includes('--color-neon-slime'));
    assert.ok(!names.includes('#1a1a2e'));
  });

  it('isAllowedPrimitive rejects invented names', () => {
    assert.equal(isAllowedPrimitive(contract, 'Button'), true);
    assert.equal(isAllowedPrimitive(contract, 'SuperButton'), false);
    assert.equal(isAllowedPrimitive(contract, 'button'), false);
  });

  it('validate_snippet fails dirty UI with stable codes', () => {
    const dirty = `
      <main className="bg-[#ff0000] p-[19px]">
        <button type="button">Go</button>
      </main>
    `;
    const result = validateSnippet(contract, dirty, 'snippet.tsx');
    assert.equal(result.ok, false);
    const codes = new Set(result.findings.map((f) => f.code));
    assert.ok(codes.has(CODES.HARDCODED_HEX));
    assert.ok(codes.has(CODES.ARBITRARY_VALUE));
    assert.ok(codes.has(CODES.NATIVE_ELEMENT));
  });

  it('validate_snippet passes clean allowlisted JSX', () => {
    const clean = `
      <Button className="bg-primary text-primary-foreground">Go</Button>
    `;
    const result = validateSnippet(contract, clean, 'snippet.tsx');
    assert.equal(result.ok, true);
    assert.equal(result.findings.length, 0);
  });
});
