import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadContract, validateContract } from '../src/contract/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cleanContract = join(root, 'fixtures/shadcn-clean/decree.contract.json');

describe('decree contract', () => {
  it('loads a valid shadcn-shaped contract', () => {
    const contract = loadContract(cleanContract);
    assert.equal(contract.version, 1);
    assert.ok(contract.components.includes('Button'));
    assert.ok(contract.tokens.some((t) => t.name === '--background'));
  });

  it('rejects contracts missing components', () => {
    assert.throws(
      () => validateContract({ version: 1, tokens: [] }),
      /components/i,
    );
  });

  it('rejects unknown contract versions', () => {
    assert.throws(
      () =>
        validateContract({
          version: 99,
          components: ['Button'],
          tokens: [{ name: '--background' }],
          nativeElementMap: {},
        }),
      /version/i,
    );
  });
});
