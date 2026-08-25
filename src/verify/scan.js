import parser from '@babel/parser';
import { CODES } from './codes.js';
import { collectImportBindings } from './imports.js';
import { extractJsxTags } from './ast-scan.js';
import {
  extractCssVars,
  extractCssVarsFromJs,
  tokenNameSet,
} from './tokens.js';
import {
  formatDeprecatedComponentMessage,
  formatDeprecatedTokenMessage,
  getComponentDeprecation,
  getTokenDeprecation,
} from './deprecations.js';
import {
  getComponentApi,
  isPassthroughProp,
} from './component-apis.js';
import { restyleFindings } from './restyle.js';

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const ARBITRARY_RE = /\[[\d.]+(?:px|rem|em|%)\]/g;
const RGB_HSL_RE =
  /\b(?:rgb|rgba|hsl|hsla|hwb)\(\s*[^)]+\)/gi;
/** Legacy fallback when AST parse fails entirely */
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
 * @returns {any | null}
 */
function tryParse(source) {
  try {
    return parser.parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
      allowReturnOutsideFunction: true,
    });
  } catch {
    return null;
  }
}

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

  // --- Colors / arbitrary (string-aware-ish regex; URL fragment skips) ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (line.trimStart().startsWith('//')) continue;
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) {
      continue;
    }

    for (const match of line.matchAll(HEX_RE)) {
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
  }

  // --- JSX components + native elements (AST, regex fallback) ---
  if (JSX_EXT.test(file)) {
    const { tags, ok } = extractJsxTags(source, file);
    if (ok) {
      for (const tag of tags) {
        if (tag.native) {
          const component = contract.nativeElementMap?.[tag.name];
          if (component && allow.has(component)) {
            findings.push({
              code: CODES.NATIVE_ELEMENT,
              message: `Native <${tag.name}> used — use allowlisted <${component}> instead`,
              file,
              line: tag.line,
            });
          }
          continue;
        }
        const name = tag.name;
        if (REACT_RUNTIME_COMPONENTS.has(name)) continue;
        const allowlisted = resolveAllowlistedName(name, allow, aliases);
        if (allowlisted) {
          const finding = deprecatedComponentFinding(
            allowlisted,
            contract,
            file,
            tag.line,
          );
          if (finding) findings.push(finding);
          findings.push(
            ...componentApiFindings(allowlisted, tag, contract, file),
          );
          findings.push(...restyleFindings(allowlisted, tag, contract, file));
          continue;
        }
        if (localComponents.has(name)) continue;
        if (hosts.has(name)) continue;
        findings.push({
          code: CODES.UNKNOWN_COMPONENT,
          message: `Unknown component <${name}> — not in the Decree contract allowlist`,
          file,
          line: tag.line,
        });
      }
    } else {
      // Legacy regex fallback
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNo = i + 1;
        if (line.trimStart().startsWith('//')) continue;
        for (const match of line.matchAll(JSX_COMPONENT_RE)) {
          const name = match[1];
          if (REACT_RUNTIME_COMPONENTS.has(name)) continue;
          const allowlisted = resolveAllowlistedName(name, allow, aliases);
          if (allowlisted) {
            const finding = deprecatedComponentFinding(
              allowlisted,
              contract,
              file,
              lineNo,
            );
            if (finding) findings.push(finding);
            continue;
          }
          if (localComponents.has(name)) continue;
          if (hosts.has(name)) continue;
          findings.push({
            code: CODES.UNKNOWN_COMPONENT,
            message: `Unknown component <${name}> — not in the Decree contract allowlist`,
            file,
            line: lineNo,
          });
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
    }
  }

  // --- Positive token enforcement (only when contract lists tokens) ---
  const knownTokens = tokenNameSet(contract);
  if (knownTokens.size > 0) {
    if (file.endsWith('.css')) {
      for (let i = 0; i < lines.length; i++) {
        for (const name of extractCssVars(lines[i])) {
          if (!knownTokens.has(name)) {
            findings.push({
              code: CODES.UNKNOWN_TOKEN,
              message: `Unknown token ${name} — not in the Decree contract token list`,
              file,
              line: i + 1,
            });
            continue;
          }
          const finding = deprecatedTokenFinding(name, contract, file, i + 1);
          if (finding) findings.push(finding);
        }
      }
    } else if (JSX_EXT.test(file)) {
      for (const { name, line } of extractCssVarsFromJs(source, tryParse)) {
        if (!knownTokens.has(name)) {
          findings.push({
            code: CODES.UNKNOWN_TOKEN,
            message: `Unknown token ${name} — not in the Decree contract token list`,
            file,
            line,
          });
          continue;
        }
        const finding = deprecatedTokenFinding(name, contract, file, line);
        if (finding) findings.push(finding);
      }
    }
  }

  return findings;
}

/**
 * @param {string} name
 * @param {Set<string>} allow
 * @param {Map<string, string>} aliases
 * @returns {string | null}
 */
function resolveAllowlistedName(name, allow, aliases) {
  if (allow.has(name)) return name;
  const resolved = aliases.get(name);
  if (resolved && allow.has(resolved)) return resolved;
  return null;
}

/**
 * @param {string} resolvedName
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} file
 * @param {number} line
 * @returns {Finding | null}
 */
function deprecatedComponentFinding(resolvedName, contract, file, line) {
  const notice = getComponentDeprecation(contract, resolvedName);
  if (!notice) return null;
  return {
    code: CODES.DEPRECATED_COMPONENT,
    message: formatDeprecatedComponentMessage(resolvedName, notice),
    file,
    line,
  };
}

/**
 * @param {string} name
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} file
 * @param {number} line
 * @returns {Finding | null}
 */
function deprecatedTokenFinding(name, contract, file, line) {
  const notice = getTokenDeprecation(contract, name);
  if (!notice) return null;
  return {
    code: CODES.DEPRECATED_TOKEN,
    message: formatDeprecatedTokenMessage(name, notice),
    file,
    line,
  };
}

/**
 * AST-only API checks. Missing componentApis / missing key → no findings.
 * @param {string} resolvedName
 * @param {import('./ast-scan.js').JsxTag} tag
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} file
 * @returns {Finding[]}
 */
function componentApiFindings(resolvedName, tag, contract, file) {
  const api = getComponentApi(contract, resolvedName);
  if (!api || !api.props || Object.keys(api.props).length === 0) return [];

  /** @type {Finding[]} */
  const findings = [];
  const allowedProps = new Set(Object.keys(api.props));
  const attrs = tag.attrs || [];

  for (const attr of attrs) {
    if (isPassthroughProp(attr.name)) continue;
    if (!allowedProps.has(attr.name)) {
      findings.push({
        code: CODES.UNKNOWN_PROP,
        message: `Unknown prop ${attr.name} on <${resolvedName}> — not in the Decree component API`,
        file,
        line: tag.line,
      });
      continue;
    }
    if (attr.dynamic || attr.literalValue === undefined) continue;
    const def = api.props[attr.name];
    if (def.enum && !def.enum.includes(String(attr.literalValue))) {
      findings.push({
        code: CODES.INVALID_PROP_VALUE,
        message: `Invalid prop ${attr.name}="${String(attr.literalValue)}" on <${resolvedName}> — allowed: ${def.enum.join(', ')}`,
        file,
        line: tag.line,
      });
      continue;
    }
    if (def.type && !literalMatchesType(attr.literalValue, def.type)) {
      findings.push({
        code: CODES.INVALID_PROP_VALUE,
        message: `Invalid prop ${attr.name} on <${resolvedName}> — expected ${def.type}`,
        file,
        line: tag.line,
      });
    }
  }

  if (tag.spread) return findings;
  const staticLiterals = new Map();
  for (const attr of attrs) {
    if (attr.dynamic || attr.literalValue === undefined) continue;
    if (isPassthroughProp(attr.name)) continue;
    staticLiterals.set(attr.name, attr.literalValue);
  }
  for (const combo of api.forbiddenCombinations || []) {
    const keys = Object.keys(combo);
    if (keys.length === 0) continue;
    const matches = keys.every((key) => {
      if (!staticLiterals.has(key)) return false;
      return sameLiteral(staticLiterals.get(key), combo[key]);
    });
    if (matches) {
      const shown = keys
        .map((k) => `${k}=${JSON.stringify(combo[k])}`)
        .join(', ');
      findings.push({
        code: CODES.INVALID_PROP_COMBO,
        message: `Forbidden prop combination on <${resolvedName}> — ${shown}`,
        file,
        line: tag.line,
      });
    }
  }
  return findings;
}

/**
 * @param {string | boolean | number} value
 * @param {'boolean' | 'string' | 'number'} type
 */
function literalMatchesType(value, type) {
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number') return typeof value === 'number';
  return typeof value === 'string';
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function sameLiteral(a, b) {
  return a === b || String(a) === String(b);
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
