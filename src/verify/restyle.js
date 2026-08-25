/** Restyle refusal on allowlisted primitives (style / sx / arbitrary class). */

import { CODES } from './codes.js';

export const RESTYLE_KEYS = Object.freeze(['style', 'sx', 'arbitraryClass']);

/**
 * Tailwind paint/size arbitrary values — not data-[state] or [&_svg] selectors.
 * Those composition selectors are too common to refuse without a flood of findings.
 */
const ARBITRARY_SIZE_RE = /\[[\d.]+(?:px|rem|em|%)\]/;
const ARBITRARY_HEX_RE = /\[#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\]/;

/**
 * @typedef {{
 *   style: boolean,
 *   sx: boolean,
 *   arbitraryClass: boolean,
 * }} RestylePolicy
 */

/**
 * @param {unknown} input
 * @param {string} [label]
 * @returns {RestylePolicy}
 */
export function parseRestyle(input, label = 'restyle') {
  if (input === true) {
    return { style: true, sx: true, arbitraryClass: true };
  }
  if (input === false) {
    return { style: false, sx: false, arbitraryClass: false };
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be true, false, or an object`);
  }
  const raw = /** @type {Record<string, unknown>} */ (input);
  for (const key of Object.keys(raw)) {
    if (!RESTYLE_KEYS.includes(key)) {
      throw new Error(`${label} has unknown key "${key}"`);
    }
  }
  /** @type {RestylePolicy} */
  const out = { style: false, sx: false, arbitraryClass: false };
  for (const key of RESTYLE_KEYS) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== 'boolean') {
      throw new Error(`${label}.${key} must be a boolean`);
    }
    out[key] = raw[key];
  }
  return out;
}

/**
 * @param {RestylePolicy | null | undefined} policy
 */
export function restyleEnabled(policy) {
  return Boolean(policy && (policy.style || policy.sx || policy.arbitraryClass));
}

/**
 * @param {RestylePolicy | undefined} policy
 * @returns {RestylePolicy | undefined}
 */
export function canonicalizeRestyle(policy) {
  if (!policy || !restyleEnabled(policy)) return undefined;
  return {
    style: Boolean(policy.style),
    sx: Boolean(policy.sx),
    arbitraryClass: Boolean(policy.arbitraryClass),
  };
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @returns {RestylePolicy | null}
 */
export function getRestylePolicy(contract) {
  if (contract.restyle === undefined) return null;
  return parseRestyle(contract.restyle);
}

/**
 * @param {string} className
 */
export function classHasArbitraryPaint(className) {
  return ARBITRARY_SIZE_RE.test(className) || ARBITRARY_HEX_RE.test(className);
}

/**
 * @param {import('./ast-scan.js').JsxAttr} attr
 * @returns {string[]}
 */
export function classNameStrings(attr) {
  /** @type {string[]} */
  const out = [];
  if (typeof attr.literalValue === 'string') out.push(attr.literalValue);
  if (Array.isArray(attr.stringLiterals)) out.push(...attr.stringLiterals);
  return out;
}

/**
 * AST-only restyle checks. Missing restyle / all flags false → no findings.
 * Spreads are not guessed.
 * @param {string} resolvedName
 * @param {import('./ast-scan.js').JsxTag} tag
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} file
 * @returns {{ code: string, message: string, file: string, line: number }[]}
 */
export function restyleFindings(resolvedName, tag, contract, file) {
  const policy = getRestylePolicy(contract);
  if (!policy || !restyleEnabled(policy)) return [];

  /** @type {{ code: string, message: string, file: string, line: number }[]} */
  const findings = [];
  const attrs = tag.attrs || [];

  if (policy.style && attrs.some((attr) => attr.name === 'style')) {
    findings.push({
      code: CODES.RESTYLE_STYLE,
      message: `Restyle of <${resolvedName}> via style= — use a contract variant or token instead`,
      file,
      line: tag.line,
    });
  }
  if (policy.sx && attrs.some((attr) => attr.name === 'sx')) {
    findings.push({
      code: CODES.RESTYLE_SX,
      message: `Restyle of <${resolvedName}> via sx= — use a contract variant or token instead`,
      file,
      line: tag.line,
    });
  }
  if (policy.arbitraryClass) {
    for (const attr of attrs) {
      if (attr.name !== 'className' && attr.name !== 'class') continue;
      for (const value of classNameStrings(attr)) {
        if (!classHasArbitraryPaint(value)) continue;
        findings.push({
          code: CODES.RESTYLE_ARBITRARY_CLASS,
          message: `Restyle of <${resolvedName}> via arbitrary class ${firstArbitrary(value)} — use a contract variant or token instead`,
          file,
          line: tag.line,
        });
        break;
      }
    }
  }
  return findings;
}

/**
 * @param {string} className
 */
function firstArbitrary(className) {
  const size = className.match(ARBITRARY_SIZE_RE);
  if (size) return size[0];
  const hex = className.match(ARBITRARY_HEX_RE);
  return hex ? hex[0] : '[]';
}
