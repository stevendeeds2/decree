/** Shared deprecation lookup + message format (scan + MCP). */

export const DEPRECATION_FIELD_KEYS = Object.freeze([
  'replacement',
  'reason',
  'since',
  'removeAfter',
]);

/**
 * @typedef {{
 *   replacement?: string,
 *   reason?: string,
 *   since?: string,
 *   removeAfter?: string,
 * }} DeprecationNotice
 *
 * @typedef {{
 *   components?: Record<string, DeprecationNotice>,
 *   tokens?: Record<string, DeprecationNotice>,
 * }} DeprecationsMap
 */

/**
 * Structure-only parse (no allowlist cross-check).
 * @param {unknown} input
 * @param {string} [label]
 * @returns {DeprecationsMap}
 */
export function parseDeprecations(input, label = 'deprecations') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  const raw = /** @type {Record<string, unknown>} */ (input);
  for (const key of Object.keys(raw)) {
    if (key !== 'components' && key !== 'tokens') {
      throw new Error(`${label} has unknown key "${key}"`);
    }
  }
  /** @type {DeprecationsMap} */
  const out = {};
  if (raw.components !== undefined) {
    out.components = parseNoticeMap(raw.components, `${label}.components`);
  }
  if (raw.tokens !== undefined) {
    out.tokens = parseNoticeMap(raw.tokens, `${label}.tokens`);
  }
  return out;
}

/**
 * @param {unknown} input
 * @param {string} label
 * @returns {Record<string, DeprecationNotice>}
 */
function parseNoticeMap(input, label) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  /** @type {Record<string, DeprecationNotice>} */
  const out = {};
  for (const [name, value] of Object.entries(
    /** @type {Record<string, unknown>} */ (input),
  )) {
    if (name.length === 0) {
      throw new Error(`${label} has an empty name`);
    }
    out[name] = parseNotice(value, `${label}.${name}`);
  }
  return out;
}

/**
 * @param {unknown} input
 * @param {string} label
 * @returns {DeprecationNotice}
 */
function parseNotice(input, label) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  const raw = /** @type {Record<string, unknown>} */ (input);
  /** @type {DeprecationNotice} */
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!DEPRECATION_FIELD_KEYS.includes(key)) {
      throw new Error(`${label} has unknown key "${key}"`);
    }
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`${label}.${key} must be a non-empty string`);
    }
    out[/** @type {keyof DeprecationNotice} */ (key)] = value;
  }
  return out;
}

/**
 * @param {DeprecationsMap} deprecations
 * @param {string[]} components
 * @param {string[]} tokenNames
 */
export function assertDeprecationsReferToAllowlist(
  deprecations,
  components,
  tokenNames,
) {
  const componentSet = new Set(components);
  const tokenSet = new Set(tokenNames);

  for (const [name, notice] of Object.entries(deprecations.components || {})) {
    if (!componentSet.has(name)) {
      throw new Error(
        `deprecations.components.${name} is not in contract.components`,
      );
    }
    if (notice.replacement !== undefined) {
      if (notice.replacement === name) {
        throw new Error(
          `deprecations.components.${name}.replacement must not equal the deprecated name`,
        );
      }
      if (!componentSet.has(notice.replacement)) {
        throw new Error(
          `deprecations.components.${name}.replacement "${notice.replacement}" is not in contract.components`,
        );
      }
    }
  }

  for (const [name, notice] of Object.entries(deprecations.tokens || {})) {
    if (!tokenSet.has(name)) {
      throw new Error(`deprecations.tokens.${name} is not in contract.tokens`);
    }
    if (notice.replacement !== undefined) {
      if (notice.replacement === name) {
        throw new Error(
          `deprecations.tokens.${name}.replacement must not equal the deprecated name`,
        );
      }
      if (!tokenSet.has(notice.replacement)) {
        throw new Error(
          `deprecations.tokens.${name}.replacement "${notice.replacement}" is not in contract.tokens`,
        );
      }
    }
  }
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} name
 * @returns {DeprecationNotice | null}
 */
export function getComponentDeprecation(contract, name) {
  const notice = contract.deprecations?.components?.[name];
  return notice && typeof notice === 'object' ? notice : null;
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} name
 * @returns {DeprecationNotice | null}
 */
export function getTokenDeprecation(contract, name) {
  const notice = contract.deprecations?.tokens?.[name];
  return notice && typeof notice === 'object' ? notice : null;
}

/**
 * @param {string} name
 * @param {DeprecationNotice} notice
 */
export function formatDeprecatedComponentMessage(name, notice) {
  return formatDeprecatedMessage('component', name, notice);
}

/**
 * @param {string} name
 * @param {DeprecationNotice} notice
 */
export function formatDeprecatedTokenMessage(name, notice) {
  return formatDeprecatedMessage('token', name, notice);
}

/**
 * @param {'component' | 'token'} kind
 * @param {string} name
 * @param {DeprecationNotice} notice
 */
function formatDeprecatedMessage(kind, name, notice) {
  let msg = `Deprecated ${kind} <${name}>`;
  if (notice.replacement) {
    msg += ` — use <${notice.replacement}> instead`;
  }
  /** @type {string[]} */
  const extras = [];
  if (notice.reason) extras.push(notice.reason);
  if (notice.since) extras.push(`since ${notice.since}`);
  if (notice.removeAfter) extras.push(`remove after ${notice.removeAfter}`);
  if (extras.length > 0) {
    msg += ` (${extras.join('; ')})`;
  }
  return msg;
}

/**
 * @param {DeprecationNotice} notice
 * @returns {DeprecationNotice}
 */
export function deprecationPublicFields(notice) {
  /** @type {DeprecationNotice} */
  const out = {};
  for (const key of DEPRECATION_FIELD_KEYS) {
    if (notice[key] !== undefined) out[key] = notice[key];
  }
  return out;
}

/**
 * @param {DeprecationsMap | undefined} deprecations
 */
export function hasDeprecationEntries(deprecations) {
  if (!deprecations) return false;
  const components = deprecations.components
    ? Object.keys(deprecations.components).length
    : 0;
  const tokens = deprecations.tokens ? Object.keys(deprecations.tokens).length : 0;
  return components + tokens > 0;
}

/**
 * Stable sorted deprecations for prepare --check. Omits empty maps.
 * @param {DeprecationsMap | undefined} deprecations
 * @returns {DeprecationsMap | undefined}
 */
export function canonicalizeDeprecations(deprecations) {
  if (!hasDeprecationEntries(deprecations)) return undefined;
  /** @type {DeprecationsMap} */
  const out = {};
  if (
    deprecations.components &&
    Object.keys(deprecations.components).length > 0
  ) {
    out.components = sortNoticeMap(deprecations.components);
  }
  if (deprecations.tokens && Object.keys(deprecations.tokens).length > 0) {
    out.tokens = sortNoticeMap(deprecations.tokens);
  }
  return out;
}

/**
 * @param {Record<string, DeprecationNotice>} map
 * @returns {Record<string, DeprecationNotice>}
 */
function sortNoticeMap(map) {
  return Object.fromEntries(
    Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, notice]) => [name, deprecationPublicFields(notice)]),
  );
}
