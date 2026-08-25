import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { flattenDtcgPaths, inferNativeElementMap } from '../extract.js';
import { isPassthroughProp } from '../../verify/component-apis.js';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '.next',
]);

const DOC_EXT = new Set(['.json', '.yaml', '.yml']);

/**
 * @param {string} inputRoot
 */
export function resolveInputRoot(inputRoot) {
  const resolved = resolve(inputRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Adapter input not found: ${resolved}`);
  }
  return resolved;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function walkFiles(root) {
  /** @type {string[]} */
  const out = [];
  walkInto(root, root, out);
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} root
 * @param {string} dir
 * @param {string[]} out
 */
function walkInto(root, dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = join(dir, ent.name);
    const rel = relative(root, full);
    if (!rel || rel.startsWith('..')) continue;
    if (ent.isDirectory()) {
      walkInto(root, full, out);
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
}

/**
 * @param {string} file
 */
export function isDocumentFile(file) {
  return DOC_EXT.has(extname(file).toLowerCase());
}

/**
 * @param {string} file
 */
export function isTokenFile(file) {
  const base = basename(file).toLowerCase();
  const norm = file.replace(/\\/g, '/').toLowerCase();
  if (base === 'package.json' || base === 'package-lock.json') return false;
  if (base.includes('schema')) return false;
  if (base.startsWith('tokens.') && isDocumentFile(file)) return true;
  if (base.endsWith('.tokens.json') || base.endsWith('.tokens.yaml') || base.endsWith('.tokens.yml')) {
    return true;
  }
  return /(?:^|\/)tokens\//.test(norm) && isDocumentFile(file);
}

/**
 * @param {string} file
 * @returns {unknown}
 */
export function loadDocument(file) {
  const text = readFileSync(file, 'utf8');
  const ext = extname(file).toLowerCase();
  try {
    if (ext === '.json') return JSON.parse(text);
    return parseYaml(text);
  } catch (err) {
    throw new Error(
      `Invalid ${ext.slice(1) || 'document'} at ${file}: ${
        err instanceof Error ? err.message : err
      }`,
    );
  }
}

/**
 * @param {string} raw
 * @returns {string | null}
 */
export function toAllowlistName(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const leaf = trimmed.includes('.')
    ? /** @type {string} */ (trimmed.split('.').pop())
    : trimmed;
  const parts = leaf.split(/[-_\s]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const pascal = parts
    .map((part, i) => {
      if (i === 0 && parts.length === 1 && /^[A-Z]/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
  return /^[A-Z][A-Za-z0-9]*$/.test(pascal) ? pascal : null;
}

/**
 * @param {string} root
 * @param {{ name?: string }} [opts]
 */
export function contractIdentity(root, opts = {}) {
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (typeof pkg.name === 'string' && pkg.name.length > 0) {
        return {
          name: opts.name || pkg.name,
          package: pkg.name,
        };
      }
    } catch {
      // fall through
    }
  }
  return {
    name: opts.name || basename(root) || 'decree-contract',
  };
}

/**
 * Collect DTCG / CSS-var token names. Skips anatomy style walks.
 * @param {string} root
 * @param {unknown[]} [inlineTrees]
 * @returns {{ name: string }[]}
 */
export function collectTokenEntries(root, inlineTrees = []) {
  /** @type {Set<string>} */
  const names = new Set();
  const addTree = (tree) => {
    if (Array.isArray(tree)) {
      for (const item of tree) {
        if (typeof item === 'string' && item.length > 0) {
          names.add(item.startsWith('--') ? item : `--${item.replaceAll('.', '-')}`);
        }
      }
      return;
    }
    for (const path of flattenDtcgPaths(tree)) {
      names.add(`--${path.replaceAll('.', '-')}`);
    }
  };
  for (const tree of inlineTrees) addTree(tree);
  if (existsSync(root) && statSync(root).isDirectory()) {
    for (const file of walkFiles(root)) {
      if (!isTokenFile(file)) continue;
      try {
        addTree(loadDocument(file));
      } catch {
        // ignore unreadable token files; components still compile
      }
    }
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name }));
}

/**
 * @param {string} name
 * @param {unknown} def
 * @returns {{ enum?: string[], type?: 'boolean' | 'string' | 'number' } | null}
 */
export function mapJudgeProp(name, def) {
  if (isPassthroughProp(name)) return null;
  if (!def || typeof def !== 'object' || Array.isArray(def)) return null;
  const raw = /** @type {Record<string, unknown>} */ (def);
  const type = raw.type;
  if (type === 'slot' || type === 'image') return null;
  // Specs 2 schema EnumProp uses `enum`; the CLI overview example uses
  // `type: variant` with `values`. Accept both spellings.
  const enumSource =
    Array.isArray(raw.enum) && raw.enum.length > 0
      ? raw.enum
      : Array.isArray(raw.values) && raw.values.length > 0
        ? raw.values
        : null;
  if (enumSource) {
    const values = enumSource.map((item) => {
      if (typeof item === 'string' && item.length > 0) return item;
      if (typeof item === 'number' || typeof item === 'boolean') return String(item);
      return null;
    });
    if (values.some((v) => v === null)) return null;
    const unique = [...new Set(/** @type {string[]} */ (values))];
    if (unique.length === 0) return null;
    return {
      enum: unique,
      ...(type === 'boolean' || type === 'string' || type === 'number'
        ? { type }
        : { type: 'string' }),
    };
  }
  if (type === 'boolean' || type === 'string' || type === 'number') {
    return { type };
  }
  return null;
}

/**
 * @param {Record<string, { enum?: string[], type?: 'boolean' | 'string' | 'number' }>} props
 * @param {unknown} combos
 */
export function mapForbiddenCombinations(props, combos) {
  if (!Array.isArray(combos)) return undefined;
  const propNames = new Set(Object.keys(props));
  /** @type {Record<string, string | boolean | number>[]} */
  const out = [];
  for (const item of combos) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    /** @type {Record<string, string | boolean | number>} */
    const combo = {};
    for (const [key, value] of Object.entries(
      /** @type {Record<string, unknown>} */ (item),
    )) {
      if (!propNames.has(key)) continue;
      if (
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        typeof value === 'number'
      ) {
        combo[key] = value;
      }
    }
    if (Object.keys(combo).length > 0) out.push(combo);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * @param {string[]} components
 * @param {Record<string, string>} [extra]
 */
export function nativeMapFor(components, extra = {}) {
  return {
    ...inferNativeElementMap(components),
    ...extra,
  };
}

/**
 * @param {string} file
 */
export function stemName(file) {
  return basename(file).replace(/\.(contract\.)?(json|ya?ml)$/i, '');
}

/**
 * Keep replacement only when it is already on the compiled allowlist.
 * @param {import('../../verify/deprecations.js').DeprecationNotice} notice
 * @param {string[]} components
 */
export function withKnownReplacement(notice, components) {
  if (!notice.replacement) return notice;
  const mapped = toAllowlistName(notice.replacement);
  if (!mapped || !components.includes(mapped)) {
    const { replacement: _drop, ...rest } = notice;
    return rest;
  }
  return { ...notice, replacement: mapped };
}
