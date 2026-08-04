import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const COMPONENT_FILE =
  /^[A-Z][A-Za-z0-9]*\.(jsx?|tsx?|mjs|cjs)$/;

const NATIVE_MAP = {
  Button: 'button',
  Input: 'input',
  Textarea: 'textarea',
  Select: 'select',
  Label: 'label',
  Link: 'a',
  Checkbox: 'input',
  Radio: 'input',
};

/**
 * @param {string} packageRoot
 * @returns {string[]}
 */
export function extractComponents(packageRoot) {
  const pkg = readPackageJson(packageRoot);
  const modulePaths = new Set(collectExportTargets(pkg, packageRoot));

  // Prefer PascalCase filenames; also accept components/ tree walk as fallback
  for (const file of walkFiles(packageRoot)) {
    const base = basename(file);
    if (!COMPONENT_FILE.test(base)) continue;
    if (file.includes(`${join('node_modules')}`)) continue;
    modulePaths.add(file);
  }

  const names = new Set();
  for (const file of modulePaths) {
    if (!existsSync(file)) continue;
    const base = basename(file);
    if (!COMPONENT_FILE.test(base)) continue;
    const source = readFileSync(file, 'utf8');
    for (const name of parseExportedComponents(source)) {
      names.add(name);
    }
    // Filename itself is a strong signal when exports are re-export only
    names.add(base.replace(/\.(jsx?|tsx?|mjs|cjs)$/, ''));
  }

  // Drop accidental lowercase helpers if somehow added
  return [...names].filter((n) => /^[A-Z]/.test(n)).sort();
}

/**
 * @param {string} packageRoot
 * @returns {{ name: string }[]}
 */
export function extractTokens(packageRoot) {
  /** @type {Set<string>} */
  const names = new Set();

  for (const file of walkFiles(packageRoot)) {
    if (!/\.(css|scss)$/.test(file)) continue;
    if (file.includes(`${join('node_modules')}`)) continue;
    const css = readFileSync(file, 'utf8');
    for (const m of css.matchAll(/--([a-zA-Z0-9-_]+)/g)) {
      names.add(`--${m[1]}`);
    }
  }

  const tokensJson = join(packageRoot, 'tokens.json');
  if (existsSync(tokensJson)) {
    try {
      const tree = JSON.parse(readFileSync(tokensJson, 'utf8'));
      for (const path of flattenDtcgPaths(tree)) {
        names.add(`--${path.replaceAll('.', '-')}`);
      }
    } catch {
      // ignore invalid tokens.json
    }
  }

  return [...names].sort().map((name) => ({ name }));
}

/**
 * @param {string[]} components
 * @returns {Record<string, string>}
 */
export function inferNativeElementMap(components) {
  /** @type {Record<string, string>} */
  const map = {};
  const set = new Set(components);
  for (const [component, native] of Object.entries(NATIVE_MAP)) {
    if (set.has(component)) map[native] = component;
  }
  return map;
}

/**
 * @param {string} source
 * @returns {string[]}
 */
export function parseExportedComponents(source) {
  /** @type {Set<string>} */
  const names = new Set();

  for (const m of source.matchAll(
    /export\s+(?:async\s+)?function\s+([A-Z][A-Za-z0-9]*)\b/g,
  )) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(
    /export\s+const\s+([A-Z][A-Za-z0-9]*)\s*=/g,
  )) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const cleaned = part.trim();
      if (!cleaned || cleaned === 'default') continue;
      const asMatch = cleaned.match(
        /([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)/,
      );
      const name = asMatch ? asMatch[2] : cleaned;
      if (/^[A-Z]/.test(name)) names.add(name);
    }
  }

  return [...names];
}

/**
 * @param {unknown} node
 * @param {string} [prefix]
 * @param {string[]} [out]
 * @returns {string[]}
 */
function flattenDtcgPaths(node, prefix = '', out = []) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return out;
  for (const [key, value] of Object.entries(
    /** @type {Record<string, unknown>} */ (node),
  )) {
    if (key.startsWith('$')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$value' in /** @type {object} */ (value)) {
        out.push(path);
      } else {
        flattenDtcgPaths(value, path, out);
      }
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} pkg
 * @param {string} packageRoot
 * @returns {string[]}
 */
function collectExportTargets(pkg, packageRoot) {
  /** @type {string[]} */
  const targets = [];
  const exportsField = pkg.exports;
  if (typeof exportsField === 'string') {
    targets.push(join(packageRoot, exportsField));
  } else if (exportsField && typeof exportsField === 'object') {
    for (const value of Object.values(
      /** @type {Record<string, unknown>} */ (exportsField),
    )) {
      collectExportValue(value, packageRoot, targets);
    }
  }
  for (const field of ['main', 'module', 'types']) {
    if (typeof pkg[field] === 'string') {
      targets.push(join(packageRoot, /** @type {string} */ (pkg[field])));
    }
  }
  return targets;
}

/**
 * @param {unknown} value
 * @param {string} packageRoot
 * @param {string[]} targets
 */
function collectExportValue(value, packageRoot, targets) {
  if (typeof value === 'string') {
    // Skip globs for resolution; walk covers files
    if (value.includes('*')) return;
    targets.push(join(packageRoot, value));
    return;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const nested of Object.values(
      /** @type {Record<string, unknown>} */ (value),
    )) {
      collectExportValue(nested, packageRoot, targets);
    }
  }
}

/**
 * @param {string} packageRoot
 * @returns {Record<string, unknown>}
 */
function readPackageJson(packageRoot) {
  return JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkFiles(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
  return out;
}
