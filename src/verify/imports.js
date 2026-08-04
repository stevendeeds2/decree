/**
 * Same-file import alias → export/component name (package imports only).
 */

const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

/**
 * True for package-like specifiers we resolve in v1.
 * Skips relative (./ ../ /) and app path aliases (@/).
 * Allows scoped packages (@mui/material, …).
 * @param {string} spec
 */
export function isPackageSpecifier(spec) {
  if (!spec) return false;
  if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/')) {
    return false;
  }
  if (spec.startsWith('@/')) return false;
  return true;
}

/**
 * @param {string} spec
 * @returns {string | null}
 */
function exportNameFromDefaultPath(spec) {
  const cleaned = spec.replace(/\\/g, '/').replace(/\/index(?:\.[a-z]+)?$/i, '');
  const seg = cleaned.split('/').pop() || '';
  const base = seg.replace(/\.(?:js|jsx|ts|tsx|mjs|cjs)$/i, '');
  return PASCAL.test(base) ? base : null;
}

/**
 * Parse one `{ … }` import clause into local → export maps.
 * @param {string} clause
 * @param {Map<string, string>} out
 */
function parseNamedClause(clause, out) {
  const parts = clause.split(',');
  for (let raw of parts) {
    let part = raw.trim();
    if (!part) continue;
    // Skip type-only bindings: `type Foo`, `type Foo as Bar`
    if (part.startsWith('type ')) continue;

    const asMatch = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
    if (asMatch) {
      const [, exported, local] = asMatch;
      if (PASCAL.test(exported) && !out.has(local)) out.set(local, exported);
      continue;
    }
    const idMatch = part.match(/^([A-Za-z_$][\w$]*)$/);
    if (idMatch) {
      const name = idMatch[1];
      if (PASCAL.test(name) && !out.has(name)) out.set(name, name);
    }
  }
}

/**
 * @param {string} source
 * @returns {Map<string, string>} local binding → contract component / export name
 */
export function collectImportAliases(source) {
  /** @type {Map<string, string>} */
  const out = new Map();

  // import Default from '…'
  const defaultRe =
    /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/gm;
  for (const m of source.matchAll(defaultRe)) {
    const local = m[1];
    const spec = m[2];
    if (!isPackageSpecifier(spec)) continue;
    const exported = exportNameFromDefaultPath(spec);
    if (exported && !out.has(local)) out.set(local, exported);
  }

  // import Default, { Named } from '…'
  const defaultPlusNamedRe =
    /^\s*import\s+([A-Za-z_$][\w$]*)\s*,\s*\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/gm;
  for (const m of source.matchAll(defaultPlusNamedRe)) {
    const local = m[1];
    const clause = m[2];
    const spec = m[3];
    if (!isPackageSpecifier(spec)) continue;
    const exported = exportNameFromDefaultPath(spec);
    if (exported && !out.has(local)) out.set(local, exported);
    parseNamedClause(clause, out);
  }

  // import { Named } from '…'  (skip import type { … })
  const namedRe =
    /^\s*import\s+(?!type\b)(?:type\s+)?\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/gm;
  for (const m of source.matchAll(namedRe)) {
    // If the match started with `import type {`, the negative lookahead should skip —
    // also skip when entire statement is type-only via separate check:
    const full = m[0];
    if (/^\s*import\s+type\b/.test(full)) continue;
    const clause = m[1];
    const spec = m[2];
    if (!isPackageSpecifier(spec)) continue;
    parseNamedClause(clause, out);
  }

  return out;
}
