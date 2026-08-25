import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const COMPONENT_FILE =
  /^[A-Z][A-Za-z0-9]*\.(jsx?|tsx?|mjs|cjs)$/;
/** Radix-style: button.tsx / icon-button.tsx that export PascalCase symbols. */
const COMPONENTISH_FILE = /^[a-z][a-z0-9-]*\.(jsx?|tsx?|mjs|cjs)$/;

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
 * @typedef {{
 *   fileFilter?: (fileAbs: string) => boolean,
 *   ignoreComponentNames?: string[],
 * }} ExtractComponentOptions
 */

/**
 * @typedef {{
 *   mode?: 'dtcg-only' | 'css-allowlist' | 'legacy-scan',
 *   tokenFiles?: string[],
 *   cssAllowlist?: string[],
 * }} ExtractTokenOptions
 */

/**
 * @param {string} packageRoot
 * @param {ExtractComponentOptions} [options]
 * @returns {string[]}
 */
export function extractComponents(packageRoot, options = {}) {
  const pkg = readPackageJson(packageRoot);
  const modulePaths = new Set(collectExportTargets(pkg, packageRoot));
  const fileFilter = options.fileFilter;
  const ignore = new Set(options.ignoreComponentNames ?? []);

  // Prefer PascalCase filenames; also accept components/ tree walk as fallback.
  // Package roots often live under node_modules — only skip *nested* deps.
  for (const file of walkFiles(packageRoot)) {
    const base = basename(file);
    const pascalFile = COMPONENT_FILE.test(base);
    const kebabComponent =
      COMPONENTISH_FILE.test(base) && isComponentDirPath(file);
    if (!pascalFile && !kebabComponent) continue;
    if (isNestedNodeModulesPath(packageRoot, file)) continue;
    if (fileFilter && !fileFilter(file)) continue;
    modulePaths.add(file);
  }

  const names = new Set();
  for (const file of modulePaths) {
    if (!existsSync(file)) continue;
    if (fileFilter && !fileFilter(file)) continue;
    const base = basename(file);
    const pascalFile = COMPONENT_FILE.test(base);
    const kebabComponent =
      COMPONENTISH_FILE.test(base) && isComponentDirPath(file);
    if (!pascalFile && !kebabComponent) continue;
    const source = readFileSync(file, 'utf8');
    for (const name of parseExportedComponents(source)) {
      if (!ignore.has(name)) names.add(name);
    }
    // Filename itself is a strong signal when exports are re-export only
    if (pascalFile) {
      const fromFile = base.replace(/\.(jsx?|tsx?|mjs|cjs)$/, '');
      if (!ignore.has(fromFile)) names.add(fromFile);
    }
  }

  // Drop accidental lowercase helpers if somehow added
  return [...names].filter((n) => /^[A-Z]/.test(n)).sort();
}

/**
 * @param {string} packageRoot
 * @param {ExtractTokenOptions} [options]
 * @returns {{ name: string }[]}
 */
export function extractTokens(packageRoot, options = {}) {
  /** @type {Set<string>} */
  const names = new Set();
  const mode = options.mode ?? 'legacy-scan';

  const addCssFile = (file) => {
    if (!existsSync(file)) return;
    const css = readFileSync(file, 'utf8');
    for (const m of css.matchAll(/--([a-zA-Z0-9-_]+)/g)) {
      names.add(`--${m[1]}`);
    }
  };

  const addDtcgFile = (file) => {
    if (!existsSync(file)) return;
    try {
      const tree = JSON.parse(readFileSync(file, 'utf8'));
      for (const path of flattenDtcgPaths(tree)) {
        names.add(`--${path.replaceAll('.', '-')}`);
      }
    } catch {
      // ignore invalid tokens.json
    }
  };

  if (mode === 'dtcg-only') {
    const files =
      options.tokenFiles && options.tokenFiles.length > 0
        ? options.tokenFiles.map((f) => join(packageRoot, f))
        : [join(packageRoot, 'tokens.json')];
    for (const file of files) addDtcgFile(file);
  } else if (mode === 'css-allowlist') {
    for (const rel of options.cssAllowlist ?? []) {
      addCssFile(join(packageRoot, rel));
    }
    for (const rel of options.tokenFiles ?? []) {
      if (/\.json$/i.test(rel)) addDtcgFile(join(packageRoot, rel));
      else addCssFile(join(packageRoot, rel));
    }
  } else {
    // legacy-scan
    for (const file of walkFiles(packageRoot)) {
      if (!/\.(css|scss)$/.test(file)) continue;
      if (isNestedNodeModulesPath(packageRoot, file)) continue;
      addCssFile(file);
    }
    const tokensJson = join(packageRoot, 'tokens.json');
    addDtcgFile(tokensJson);
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
export function flattenDtcgPaths(node, prefix = '', out = []) {
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
    const root = resolve(packageRoot);
    const abs = resolve(packageRoot, value);
    const rel = relative(root, abs);
    // Containment: never follow exports outside the package root
    if (rel.startsWith('..') || isAbsolute(rel)) return;
    targets.push(abs);
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

/**
 * True when `file` is inside a nested node_modules under packageRoot
 * (dependency of the package), not merely because packageRoot itself is
 * installed in someone's node_modules.
 * @param {string} packageRoot
 * @param {string} file
 */
function isNestedNodeModulesPath(packageRoot, file) {
  const rel = relative(packageRoot, file);
  if (!rel || rel.startsWith('..')) return false;
  return rel.split(/[/\\]/).includes('node_modules');
}

/** Radix `components/`, shadcn `ui/`, etc. */
function isComponentDirPath(file) {
  const norm = file.replace(/\\/g, '/');
  return /(?:^|\/)(?:components|ui)\//.test(norm);
}
