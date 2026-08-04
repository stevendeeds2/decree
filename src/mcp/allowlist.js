import { scanSource } from '../verify/scan.js';

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 */
export function listPrimitives(contract) {
  return contract.components.map((name) => ({
    name,
    kind: 'component',
    allowed: true,
  }));
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 */
export function listTokens(contract) {
  return contract.tokens.map((t) => ({
    name: t.name,
    value: t.value ?? null,
    kind: 'token',
    allowed: true,
  }));
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} name
 */
export function isAllowedPrimitive(contract, name) {
  return contract.components.includes(name);
}

/**
 * Validate a code snippet against the contract (same scanners as CI).
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} source
 * @param {string} [file]
 */
export function validateSnippet(contract, source, file = 'snippet.tsx') {
  const findings = scanSource(source, file, contract);
  return {
    ok: findings.length === 0,
    findings,
  };
}
