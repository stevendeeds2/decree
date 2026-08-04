/**
 * Default paths to skip when scanning consumer apps.
 * Covers shadcn-style vendored DS folders and theme token dumps.
 */
export const DEFAULT_EXCLUDE_PREFIXES = [
  'src/components/ui',
  'components/ui',
  'src/styles/themes',
  'styles/themes',
];

/**
 * @param {string} prefix
 * @returns {string}
 */
export function normalizePrefix(prefix) {
  return String(prefix).replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Reject absolute paths and `..` traversal in contract scan prefixes.
 * @param {string} prefix
 * @param {string} fieldName
 */
export function assertSafeScanPrefix(prefix, fieldName = 'scan prefix') {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new Error(`Decree ${fieldName} must be a non-empty string`);
  }
  const norm = normalizePrefix(prefix);
  if (norm.startsWith('/') || /^[A-Za-z]:/.test(norm)) {
    throw new Error(
      `Decree ${fieldName} must be a relative path (not absolute): ${prefix}`,
    );
  }
  const parts = norm.split('/');
  if (parts.some((p) => p === '..')) {
    throw new Error(
      `Decree ${fieldName} must not contain '..': ${prefix}`,
    );
  }
  return norm;
}

/**
 * @param {{ excludePrefixes?: string[], excludeDefaults?: boolean } | undefined} scan
 * @returns {string[]}
 */
export function resolveExcludePrefixes(scan = {}) {
  const custom = Array.isArray(scan.excludePrefixes)
    ? scan.excludePrefixes.map((p) => assertSafeScanPrefix(p, 'scan.excludePrefixes'))
    : [];
  if (scan.excludeDefaults === false) {
    return [...new Set(custom)];
  }
  return [
    ...new Set([
      ...DEFAULT_EXCLUDE_PREFIXES.map((p) => normalizePrefix(p)),
      ...custom,
    ]),
  ];
}
