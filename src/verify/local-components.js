import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const SOURCE_RE = /\.(tsx|jsx|ts|js)$/;
const TEST_FILE_RE = /\.(?:test|spec)\.(?:tsx|jsx|ts|js)$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '__tests__',
  'ui',
]);

const DECL_RE =
  /(?:(?:export\s+)?(?:default\s+)?function|export\s+default\s+function)\s+([A-Z][A-Za-z0-9]*)\b|(?:export\s+)?const\s+([A-Z][A-Za-z0-9]*)\s*=/g;

/**
 * @param {string} rel
 * @param {string[]} excludePrefixes
 */
function isExcluded(rel, excludePrefixes) {
  return excludePrefixes.some((p) => {
    const prefix = p.endsWith('/') ? p.slice(0, -1) : p;
    return rel === prefix || rel.startsWith(`${prefix}/`);
  });
}

/**
 * @param {string} dir
 * @param {string} root
 * @param {string[]} excludePrefixes
 * @param {string[]} acc
 */
function walk(dir, root, excludePrefixes, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const rel = relative(root, full).replace(/\\/g, '/');
    if (isExcluded(rel, excludePrefixes)) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, root, excludePrefixes, acc);
    else if (SOURCE_RE.test(name) && !TEST_FILE_RE.test(name)) acc.push(full);
  }
  return acc;
}

/**
 * @param {string} source
 * @param {Set<string>} out
 */
function addDeclarations(source, out) {
  for (const m of source.matchAll(DECL_RE)) {
    const name = m[1] || m[2];
    if (name && PASCAL.test(name)) out.add(name);
  }
}

/**
 * Discover app-local component names under configured prefixes.
 * @param {string} root project root (contains decree.contract.json)
 * @param {string[]} prefixes e.g. ['src/components']
 * @param {string[]} [excludePrefixes]
 * @returns {Set<string>}
 */
export function collectLocalComponents(
  root,
  prefixes,
  excludePrefixes = [],
) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const prefix of prefixes) {
    const dir = join(root, prefix);
    const files = walk(dir, root, excludePrefixes);
    for (const file of files) {
      const base = basename(file).replace(/\.(tsx|jsx|ts|js)$/, '');
      if (PASCAL.test(base)) names.add(base);
      const source = readFileSync(file, 'utf8');
      addDeclarations(source, names);
    }
  }
  return names;
}
