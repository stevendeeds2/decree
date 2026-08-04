import { readFileSync } from 'node:fs';

/**
 * @typedef {{ name: string, value?: string }} DecreeToken
 * @typedef {{
 *   version: number,
 *   name?: string,
 *   components: string[],
 *   tokens: DecreeToken[],
 *   nativeElementMap: Record<string, string>,
 * }} DecreeContract
 */

/**
 * @param {unknown} input
 * @returns {asserts input is DecreeContract}
 */
export function validateContract(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Decree contract must be an object');
  }
  const c = /** @type {Record<string, unknown>} */ (input);
  if (c.version !== 1) {
    throw new Error(`Unsupported Decree contract version: ${String(c.version)}`);
  }
  if (!Array.isArray(c.components) || c.components.length === 0) {
    throw new Error('Decree contract requires a non-empty components allowlist');
  }
  if (!Array.isArray(c.tokens)) {
    throw new Error('Decree contract requires a tokens array');
  }
  if (
    c.nativeElementMap === undefined ||
    c.nativeElementMap === null ||
    typeof c.nativeElementMap !== 'object' ||
    Array.isArray(c.nativeElementMap)
  ) {
    throw new Error('Decree contract requires nativeElementMap (object)');
  }
}

/**
 * @param {string} filePath
 * @returns {DecreeContract}
 */
export function loadContract(filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  validateContract(raw);
  return raw;
}
