import { CODES } from './codes.js';

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const ARBITRARY_RE = /\[[\d.]+(?:px|rem|em|%)\]/g;
const JSX_EXT = /\.(tsx|jsx|ts|js)$/;

/**
 * @typedef {{ code: string, message: string, file: string, line: number }} Finding
 */

/**
 * @param {string} source
 * @param {string} file
 * @param {import('../contract/index.js').DecreeContract} contract
 * @returns {Finding[]}
 */
export function scanSource(source, file, contract) {
  if (!JSX_EXT.test(file) && !file.endsWith('.css')) {
    return [];
  }

  /** @type {Finding[]} */
  const findings = [];
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Skip import lines for hex false positives in comments only — still scan code.
    if (line.trimStart().startsWith('//')) continue;
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) continue;

    for (const match of line.matchAll(HEX_RE)) {
      // Allow CSS variable fallbacks that reference tokens by name elsewhere; hex is always a bypass.
      findings.push({
        code: CODES.HARDCODED_HEX,
        message: `Hardcoded color ${match[0]} — use a contract token instead`,
        file,
        line: lineNo,
      });
    }

    for (const match of line.matchAll(ARBITRARY_RE)) {
      findings.push({
        code: CODES.ARBITRARY_VALUE,
        message: `Arbitrary value ${match[0]} — use a spacing/size token from the contract`,
        file,
        line: lineNo,
      });
    }

    for (const [native, component] of Object.entries(contract.nativeElementMap)) {
      if (!contract.components.includes(component)) continue;
      // JSX intrinsics are lowercase; PascalCase components must not match.
      // Allow newline-split tags: `<button\n  type=...>`
      const re = new RegExp(`<${escapeRegExp(native)}(?:\\s|>|/|$)`);
      if (re.test(line)) {
        findings.push({
          code: CODES.NATIVE_ELEMENT,
          message: `Native <${native}> used — use allowlisted <${component}> instead`,
          file,
          line: lineNo,
        });
      }
    }
  }

  return findings;
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
