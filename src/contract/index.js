import { readFileSync } from 'node:fs';
import { assertSafeScanPrefix } from '../verify/excludes.js';
import {
  assertDeprecationsReferToAllowlist,
  parseDeprecations,
} from '../verify/deprecations.js';

/**
 * @typedef {{ name: string, value?: string }} DecreeToken
 * @typedef {{
 *   replacement?: string,
 *   reason?: string,
 *   since?: string,
 *   removeAfter?: string,
 * }} DecreeDeprecationNotice
 * @typedef {{
 *   components?: Record<string, DecreeDeprecationNotice>,
 *   tokens?: Record<string, DecreeDeprecationNotice>,
 * }} DecreeDeprecations
 * @typedef {{
 *   profile?: 'strict' | 'app',
 *   localComponentPrefixes?: string[],
 *   excludePrefixes?: string[],
 *   excludeDefaults?: boolean,
 * }} DecreeScanConfig
 * @typedef {{
 *   version: number,
 *   name?: string,
 *   components: string[],
 *   tokens: DecreeToken[],
 *   nativeElementMap: Record<string, string>,
 *   scan?: DecreeScanConfig,
 *   deprecations?: DecreeDeprecations,
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
  if (c.scan !== undefined && c.scan !== null) {
    if (typeof c.scan !== 'object' || Array.isArray(c.scan)) {
      throw new Error('Decree contract scan must be an object');
    }
    const scan = /** @type {Record<string, unknown>} */ (c.scan);
    if (scan.profile !== undefined && scan.profile !== 'strict' && scan.profile !== 'app') {
      throw new Error(
        `Unsupported Decree scan.profile: ${String(scan.profile)} (use "strict" or "app")`,
      );
    }
    if (
      scan.localComponentPrefixes !== undefined &&
      !Array.isArray(scan.localComponentPrefixes)
    ) {
      throw new Error('Decree scan.localComponentPrefixes must be an array');
    }
    if (
      scan.excludePrefixes !== undefined &&
      !Array.isArray(scan.excludePrefixes)
    ) {
      throw new Error('Decree scan.excludePrefixes must be an array');
    }
    if (Array.isArray(scan.localComponentPrefixes)) {
      for (const p of scan.localComponentPrefixes) {
        assertSafeScanPrefix(p, 'scan.localComponentPrefixes');
      }
    }
    if (Array.isArray(scan.excludePrefixes)) {
      for (const p of scan.excludePrefixes) {
        assertSafeScanPrefix(p, 'scan.excludePrefixes');
      }
    }
    if (
      scan.excludeDefaults !== undefined &&
      typeof scan.excludeDefaults !== 'boolean'
    ) {
      throw new Error('Decree scan.excludeDefaults must be a boolean');
    }
  }
  if (c.deprecations !== undefined) {
    const deprecations = parseDeprecations(c.deprecations, 'deprecations');
    /** @type {string[]} */
    const tokenNames = [];
    if (Array.isArray(c.tokens)) {
      for (const token of c.tokens) {
        if (token && typeof token === 'object' && typeof token.name === 'string') {
          tokenNames.push(token.name);
        }
      }
    }
    assertDeprecationsReferToAllowlist(
      deprecations,
      /** @type {string[]} */ (c.components),
      tokenNames,
    );
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
