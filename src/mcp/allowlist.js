import { scanSource } from '../verify/scan.js';
import { CODES } from '../verify/codes.js';

/** Soft cap so MCP validate_snippet cannot become a CPU sink. */
export const MAX_SNIPPET_CHARS = 256_000;

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
 * @param {{ localComponents?: Set<string> }} [options]
 */
export function isAllowedPrimitive(contract, name, options = {}) {
  if (contract.components.includes(name)) return true;
  if (options.localComponents?.has(name)) return true;
  return false;
}

/**
 * Validate a code snippet against the contract (same scanners as CI).
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} source
 * @param {string} [file]
 * @param {{ localComponents?: Set<string> }} [options]
 */
export function validateSnippet(
  contract,
  source,
  file = 'snippet.tsx',
  options = {},
) {
  if (typeof source !== 'string' || source.length > MAX_SNIPPET_CHARS) {
    return {
      ok: false,
      findings: [
        {
          code: CODES.SNIPPET_TOO_LARGE,
          message: `Snippet exceeds ${MAX_SNIPPET_CHARS} characters — refuse to scan`,
          file,
          line: 0,
        },
      ],
    };
  }
  const findings = scanSource(source, file, contract, {
    localComponents: options.localComponents,
  });
  return {
    ok: findings.length === 0,
    findings,
  };
}
