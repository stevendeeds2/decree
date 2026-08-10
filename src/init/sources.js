import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { assertSafeScanPrefix } from '../verify/excludes.js';

/**
 * @typedef {{
 *   version: 1,
 *   components?: {
 *     include?: string[],
 *     exclude?: string[],
 *   },
 *   tokens?: {
 *     mode?: 'dtcg-only' | 'css-allowlist' | 'legacy-scan',
 *     files?: string[],
 *     cssAllowlist?: string[],
 *   },
 *   ignoreComponentNames?: string[],
 *   nativeElementMap?: Record<string, string>,
 * }} DecreeSources
 */

/**
 * @param {string} packageRoot
 * @param {string} [sourcesPath] absolute or relative to packageRoot
 * @returns {{ sources: DecreeSources | null, path: string | null, legacy: boolean }}
 */
export function loadSources(packageRoot, sourcesPath) {
  const resolved = sourcesPath
    ? isAbsolute(sourcesPath)
      ? sourcesPath
      : resolve(packageRoot, sourcesPath)
    : join(packageRoot, 'decree.sources.json');

  if (!existsSync(resolved)) {
    return { sources: null, path: null, legacy: true };
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(resolved, 'utf8'));
  } catch (err) {
    throw new Error(
      `Invalid decree.sources.json at ${resolved}: ${
        err instanceof Error ? err.message : err
      }`,
    );
  }

  const sources = validateSources(raw, resolved);
  return { sources, path: resolved, legacy: false };
}

/**
 * @param {unknown} input
 * @param {string} pathForErrors
 * @returns {DecreeSources}
 */
export function validateSources(input, pathForErrors = 'decree.sources.json') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${pathForErrors}: must be an object`);
  }
  const s = /** @type {Record<string, unknown>} */ (input);
  if (s.version !== 1) {
    throw new Error(`${pathForErrors}: unsupported version ${String(s.version)}`);
  }

  /** @type {DecreeSources} */
  const out = { version: 1 };

  if (s.components !== undefined) {
    if (!s.components || typeof s.components !== 'object') {
      throw new Error(`${pathForErrors}: components must be an object`);
    }
    const c = /** @type {Record<string, unknown>} */ (s.components);
    const include = normalizeStringList(c.include, `${pathForErrors} components.include`);
    const exclude = normalizeStringList(c.exclude, `${pathForErrors} components.exclude`);
    for (const p of include) assertSafeScanPrefix(p, 'components.include');
    for (const p of exclude) {
      // globs allowed in exclude — only reject absolute / ..
      if (p.startsWith('/') || p.includes('..')) {
        throw new Error(
          `${pathForErrors}: components.exclude entries must be relative without '..': ${p}`,
        );
      }
    }
    out.components = { include, exclude };
  }

  if (s.tokens !== undefined) {
    if (!s.tokens || typeof s.tokens !== 'object') {
      throw new Error(`${pathForErrors}: tokens must be an object`);
    }
    const t = /** @type {Record<string, unknown>} */ (s.tokens);
    const mode = t.mode ?? 'legacy-scan';
    if (mode !== 'dtcg-only' && mode !== 'css-allowlist' && mode !== 'legacy-scan') {
      throw new Error(
        `${pathForErrors}: tokens.mode must be dtcg-only | css-allowlist | legacy-scan`,
      );
    }
    const files = normalizeStringList(t.files, `${pathForErrors} tokens.files`);
    const cssAllowlist = normalizeStringList(
      t.cssAllowlist,
      `${pathForErrors} tokens.cssAllowlist`,
    );
    for (const p of [...files, ...cssAllowlist]) {
      assertSafeScanPrefix(p, 'tokens path');
    }
    out.tokens = {
      mode: /** @type {'dtcg-only' | 'css-allowlist' | 'legacy-scan'} */ (mode),
      files,
      cssAllowlist,
    };
  }

  if (s.ignoreComponentNames !== undefined) {
    out.ignoreComponentNames = normalizeStringList(
      s.ignoreComponentNames,
      `${pathForErrors} ignoreComponentNames`,
    );
  }

  if (s.nativeElementMap !== undefined) {
    if (!s.nativeElementMap || typeof s.nativeElementMap !== 'object') {
      throw new Error(`${pathForErrors}: nativeElementMap must be an object`);
    }
    /** @type {Record<string, string>} */
    const map = {};
    for (const [k, v] of Object.entries(
      /** @type {Record<string, unknown>} */ (s.nativeElementMap),
    )) {
      if (typeof v !== 'string') {
        throw new Error(`${pathForErrors}: nativeElementMap.${k} must be a string`);
      }
      map[k] = v;
    }
    out.nativeElementMap = map;
  }

  return out;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {string[]}
 */
function normalizeStringList(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value.map((item, i) => {
    if (typeof item !== 'string' || item.length === 0) {
      throw new Error(`${label}[${i}] must be a non-empty string`);
    }
    return item;
  });
}

/**
 * Minimal glob: supports `**\/` prefix and `*.stories.*` / `*.test.*` style, or exact relative path.
 * @param {string} relPath posix-ish relative path from package root
 * @param {string[]} patterns
 */
export function matchesAnyExclude(relPath, patterns) {
  const norm = relPath.replace(/\\/g, '/');
  for (const pattern of patterns) {
    const p = pattern.replace(/\\/g, '/');
    if (p.includes('*.stories.') && /\.stories\./.test(norm)) return true;
    if (p.includes('*.test.') && /\.test\./.test(norm)) return true;
    if (p.includes('*')) {
      // crude: strip ** / * and check includes
      const core = p.replace(/\*\*\//g, '').replace(/\*/g, '');
      if (core && norm.includes(core.replace(/^\//, ''))) return true;
      continue;
    }
    if (norm === p || norm.startsWith(p.endsWith('/') ? p : `${p}/`)) return true;
  }
  return false;
}

/**
 * @param {string} packageRoot
 * @param {string} fileAbs
 * @param {DecreeSources} sources
 * @returns {boolean} true if file should be scanned for components
 */
export function isComponentFileAllowed(packageRoot, fileAbs, sources) {
  const rel = relative(packageRoot, fileAbs).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) return false;

  const include = sources.components?.include ?? [];
  const exclude = sources.components?.exclude ?? [];

  if (include.length > 0) {
    const ok = include.some((inc) => {
      const n = normalize(inc).replace(/\\/g, '/');
      return rel === n || rel.startsWith(n.endsWith('/') ? n : `${n}/`);
    });
    if (!ok) return false;
  }

  if (exclude.length > 0 && matchesAnyExclude(rel, exclude)) return false;
  return true;
}
