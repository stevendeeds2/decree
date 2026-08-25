/** Shared component API schema, lookup, and findings (scan + MCP). */

export const PROP_DEF_KEYS = Object.freeze(['enum', 'type']);
export const API_ENTRY_KEYS = Object.freeze(['props', 'forbiddenCombinations']);
export const PROP_TYPES = Object.freeze(['boolean', 'string', 'number']);

export const PASSTHROUGH_EXACT = Object.freeze(
  new Set(['className', 'style', 'children', 'key', 'ref', 'id', 'sx']),
);

/**
 * @typedef {{
 *   enum?: string[],
 *   type?: 'boolean' | 'string' | 'number',
 * }} ComponentPropDef
 *
 * @typedef {{
 *   props?: Record<string, ComponentPropDef>,
 *   forbiddenCombinations?: Record<string, string | boolean | number>[],
 * }} ComponentApi
 *
 * @typedef {Record<string, ComponentApi>} ComponentApisMap
 */

/**
 * @param {string} name
 */
export function isPassthroughProp(name) {
  if (PASSTHROUGH_EXACT.has(name)) return true;
  if (name.startsWith('data-') || name.startsWith('aria-')) return true;
  if (name.startsWith('on') && name.length > 2 && name[2] === name[2].toUpperCase()) {
    return true;
  }
  return false;
}

/**
 * Structure-only parse (no allowlist cross-check).
 * @param {unknown} input
 * @param {string} [label]
 * @returns {ComponentApisMap}
 */
export function parseComponentApis(input, label = 'componentApis') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  /** @type {ComponentApisMap} */
  const out = {};
  for (const [name, value] of Object.entries(
    /** @type {Record<string, unknown>} */ (input),
  )) {
    if (name.length === 0) {
      throw new Error(`${label} has an empty name`);
    }
    out[name] = parseApiEntry(value, `${label}.${name}`);
  }
  return out;
}

/**
 * @param {unknown} input
 * @param {string} label
 * @returns {ComponentApi}
 */
function parseApiEntry(input, label) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  const raw = /** @type {Record<string, unknown>} */ (input);
  for (const key of Object.keys(raw)) {
    if (!API_ENTRY_KEYS.includes(key)) {
      throw new Error(`${label} has unknown key "${key}"`);
    }
  }
  /** @type {ComponentApi} */
  const out = {};
  if (raw.props !== undefined) {
    out.props = parsePropMap(raw.props, `${label}.props`);
  }
  if (raw.forbiddenCombinations !== undefined) {
    out.forbiddenCombinations = parseForbiddenCombinations(
      raw.forbiddenCombinations,
      `${label}.forbiddenCombinations`,
    );
  }
  return out;
}

/**
 * @param {unknown} input
 * @param {string} label
 * @returns {Record<string, ComponentPropDef>}
 */
function parsePropMap(input, label) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  /** @type {Record<string, ComponentPropDef>} */
  const out = {};
  for (const [name, value] of Object.entries(
    /** @type {Record<string, unknown>} */ (input),
  )) {
    if (name.length === 0) {
      throw new Error(`${label} has an empty name`);
    }
    out[name] = parsePropDef(value, `${label}.${name}`);
  }
  return out;
}

/**
 * @param {unknown} input
 * @param {string} label
 * @returns {ComponentPropDef}
 */
function parsePropDef(input, label) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  const raw = /** @type {Record<string, unknown>} */ (input);
  for (const key of Object.keys(raw)) {
    if (!PROP_DEF_KEYS.includes(key)) {
      throw new Error(`${label} has unknown key "${key}"`);
    }
  }
  /** @type {ComponentPropDef} */
  const out = {};
  if (raw.enum !== undefined) {
    if (!Array.isArray(raw.enum) || raw.enum.length === 0) {
      throw new Error(`${label}.enum must be a non-empty array of strings`);
    }
    out.enum = raw.enum.map((item, i) => {
      if (typeof item !== 'string' || item.length === 0) {
        throw new Error(`${label}.enum[${i}] must be a non-empty string`);
      }
      return item;
    });
    const unique = new Set(out.enum);
    if (unique.size !== out.enum.length) {
      throw new Error(`${label}.enum must not contain duplicates`);
    }
  }
  if (raw.type !== undefined) {
    if (!PROP_TYPES.includes(/** @type {string} */ (raw.type))) {
      throw new Error(
        `${label}.type must be boolean | string | number`,
      );
    }
    out.type = /** @type {ComponentPropDef['type']} */ (raw.type);
  }
  return out;
}

/**
 * @param {unknown} input
 * @param {string} label
 * @returns {Record<string, string | boolean | number>[]}
 */
function parseForbiddenCombinations(input, label) {
  if (!Array.isArray(input)) {
    throw new Error(`${label} must be an array`);
  }
  return input.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`${label}[${i}] must be an object`);
    }
    /** @type {Record<string, string | boolean | number>} */
    const combo = {};
    for (const [k, v] of Object.entries(
      /** @type {Record<string, unknown>} */ (item),
    )) {
      if (k.length === 0) {
        throw new Error(`${label}[${i}] has an empty key`);
      }
      if (typeof v !== 'string' && typeof v !== 'boolean' && typeof v !== 'number') {
        throw new Error(
          `${label}[${i}].${k} must be a string, boolean, or number`,
        );
      }
      combo[k] = v;
    }
    if (Object.keys(combo).length === 0) {
      throw new Error(`${label}[${i}] must not be empty`);
    }
    return combo;
  });
}

/**
 * @param {ComponentApisMap} apis
 * @param {string[]} components
 */
export function assertComponentApisReferToAllowlist(apis, components) {
  const componentSet = new Set(components);
  for (const [name, api] of Object.entries(apis)) {
    if (!componentSet.has(name)) {
      throw new Error(`componentApis.${name} is not in contract.components`);
    }
    const propNames = new Set(Object.keys(api.props || {}));
    for (const [i, combo] of (api.forbiddenCombinations || []).entries()) {
      for (const key of Object.keys(combo)) {
        if (!propNames.has(key)) {
          throw new Error(
            `componentApis.${name}.forbiddenCombinations[${i}] uses unknown prop "${key}"`,
          );
        }
      }
    }
  }
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} name
 * @returns {ComponentApi | null}
 */
export function getComponentApi(contract, name) {
  const api = contract.componentApis?.[name];
  return api && typeof api === 'object' ? api : null;
}

/**
 * @param {ComponentApisMap | undefined} apis
 */
export function hasComponentApiEntries(apis) {
  return Boolean(apis && Object.keys(apis).length > 0);
}

/**
 * Stable sorted APIs for prepare --check.
 * @param {ComponentApisMap | undefined} apis
 * @returns {ComponentApisMap | undefined}
 */
export function canonicalizeComponentApis(apis) {
  if (!hasComponentApiEntries(apis)) return undefined;
  /** @type {ComponentApisMap} */
  const out = {};
  for (const name of Object.keys(apis).sort((a, b) => a.localeCompare(b))) {
    const api = apis[name];
    /** @type {ComponentApi} */
    const entry = {};
    if (api.props && Object.keys(api.props).length > 0) {
      entry.props = Object.fromEntries(
        Object.entries(api.props)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([prop, def]) => [
            prop,
            {
              ...(def.enum ? { enum: [...def.enum] } : {}),
              ...(def.type ? { type: def.type } : {}),
            },
          ]),
      );
    }
    if (api.forbiddenCombinations && api.forbiddenCombinations.length > 0) {
      entry.forbiddenCombinations = api.forbiddenCombinations.map((combo) =>
        Object.fromEntries(
          Object.entries(combo).sort(([a], [b]) => a.localeCompare(b)),
        ),
      );
    }
    out[name] = entry;
  }
  return out;
}

/**
 * Public MCP/list shape for one component API.
 * @param {ComponentApi} api
 */
export function publicComponentApi(api) {
  return canonicalizeComponentApis({ _: api })?._ ?? {};
}
