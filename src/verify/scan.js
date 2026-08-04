import { CODES } from './codes.js';
import { collectImportBindings } from './imports.js';

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const ARBITRARY_RE = /\[[\d.]+(?:px|rem|em|%)\]/g;
const RGB_HSL_RE =
  /\b(?:rgb|rgba|hsl|hsla|hwb)\(\s*[^)]+\)/gi;
/** PascalCase JSX open tags: <Foo, <Foo.Bar, <Foo /> */
const JSX_COMPONENT_RE = /<([A-Z][A-Za-z0-9]*)(?:\.[A-Za-z0-9]+)?(?:\s|>|\/|$)/g;
const JSX_EXT = /\.(tsx|jsx|ts|js)$/;

/**
 * React runtime tags only — NOT Next/MUI hosts.
 * Hosts must be imported from a known host package (see imports.js)
 * or listed on the contract.
 */
const REACT_RUNTIME_COMPONENTS = new Set([
  'Fragment',
  'Suspense',
  'StrictMode',
  'Profiler',
  'Activity',
]);

/**
 * @typedef {{ code: string, message: string, file: string, line: number }} Finding
 */

/**
 * @typedef {{ localComponents?: Set<string> }} ScanOptions
 */

/**
 * @param {string} source
 * @param {string} file
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {ScanOptions} [options]
 * @returns {Finding[]}
 */
export function scanSource(source, file, contract, options = {}) {
  if (!JSX_EXT.test(file) && !file.endsWith('.css')) {
    return [];
  }

  /** @type {Finding[]} */
  const findings = [];
  const lines = source.split(/\r?\n/);
  const allow = new Set(contract.components || []);
  const localComponents = options.localComponents || new Set();
  const { aliases, hosts } = JSX_EXT.test(file)
    ? collectImportBindings(source)
    : { aliases: new Map(), hosts: new Set() };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Skip import lines for hex false positives in comments only — still scan code.
    if (line.trimStart().startsWith('//')) continue;
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) continue;

    for (const match of line.matchAll(HEX_RE)) {
      // Skip URL fragments (…/#fff) and SVG url(#id) — not color tokens
      const idx = match.index ?? 0;
      if (idx > 0 && line[idx - 1] === '/') continue;
      if (/url\(\s*$/i.test(line.slice(0, idx))) continue;
      findings.push({
        code: CODES.HARDCODED_HEX,
        message: `Hardcoded color ${match[0]} — use a contract token instead`,
        file,
        line: lineNo,
      });
    }

    for (const match of line.matchAll(RGB_HSL_RE)) {
      findings.push({
        code: CODES.HARDCODED_COLOR,
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

    if (JSX_EXT.test(file)) {
      for (const match of line.matchAll(JSX_COMPONENT_RE)) {
        const name = match[1];
        if (REACT_RUNTIME_COMPONENTS.has(name)) continue;
        if (allow.has(name)) continue;
        if (localComponents.has(name)) continue;
        if (hosts.has(name)) continue;
        const resolved = aliases.get(name);
        if (resolved && allow.has(resolved)) continue;
        findings.push({
          code: CODES.UNKNOWN_COMPONENT,
          message: `Unknown component <${name}> — not in the Decree contract allowlist`,
          file,
          line: lineNo,
        });
      }
    }

    for (const [native, component] of Object.entries(
      contract.nativeElementMap || {},
    )) {
      if (!allow.has(component)) continue;
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
