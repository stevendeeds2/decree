import { basename, dirname } from 'node:path';
import { isPassthroughProp } from '../../verify/component-apis.js';
import {
  collectTokenEntries,
  contractIdentity,
  isDocumentFile,
  loadDocument,
  mapJudgeProp,
  nativeMapFor,
  resolveInputRoot,
  stemName,
  toAllowlistName,
  walkFiles,
  withKnownReplacement,
} from './shared.js';

const NATIVE_TAGS = new Set([
  'a',
  'button',
  'input',
  'label',
  'select',
  'textarea',
]);

/**
 * Compile a Decree judge slice from Southleft DS Contracts.
 * Maps names, props/enums, tokens, deprecations. Leaves anatomy, layout, and styles behind.
 *
 * @param {string} inputRoot
 * @param {{ name?: string }} [opts]
 */
export function buildContractFromDsContracts(inputRoot, opts = {}) {
  const root = resolveInputRoot(inputRoot);
  /** @type {Map<string, { api?: import('../../verify/component-apis.js').ComponentApi, deprecated?: import('../../verify/deprecations.js').DeprecationNotice, native?: string }>} */
  const found = new Map();

  const files = isDocumentFile(root) ? [root] : walkFiles(root);
  for (const file of files) {
    if (!isDsContractFile(file)) continue;
    const doc = loadDocument(file);
    ingestDsContract(doc, file, found);
  }

  const components = [...found.keys()].sort((a, b) => a.localeCompare(b));
  if (components.length === 0) {
    throw new Error(
      `No DS Contracts found in ${root}. Expected *.contract.json files with id/name and props.`,
    );
  }

  /** @type {import('../../contract/index.js').DecreeContract['componentApis']} */
  const componentApis = {};
  /** @type {NonNullable<import('../../contract/index.js').DecreeContract['deprecations']>} */
  const deprecations = { components: {} };
  /** @type {Record<string, string>} */
  const extraNative = {};
  for (const name of components) {
    const entry = found.get(name);
    if (entry?.api && (entry.api.props || entry.api.forbiddenCombinations)) {
      componentApis[name] = entry.api;
    }
    if (entry?.deprecated) {
      deprecations.components[name] = withKnownReplacement(
        entry.deprecated,
        components,
      );
    }
    if (entry?.native) extraNative[entry.native] = name;
  }

  const identity = contractIdentity(isDocumentFile(root) ? dirname(root) : root, opts);
  /** @type {import('../../contract/index.js').DecreeContract & { package?: string }} */
  const contract = {
    version: 1,
    name: identity.name,
    ...(identity.package ? { package: identity.package } : {}),
    components,
    tokens: collectTokenEntries(isDocumentFile(root) ? dirname(root) : root),
    nativeElementMap: nativeMapFor(components, extraNative),
  };
  if (Object.keys(componentApis).length > 0) {
    contract.componentApis = componentApis;
  }
  if (Object.keys(deprecations.components).length > 0) {
    contract.deprecations = deprecations;
  }
  return contract;
}

/**
 * @param {string} file
 */
function isDsContractFile(file) {
  const base = basename(file).toLowerCase();
  if (base.includes('schema')) return false;
  return base.endsWith('.contract.json') || base.endsWith('.contract.yaml') || base.endsWith('.contract.yml');
}

/**
 * @param {unknown} doc
 * @param {string} file
 * @param {Map<string, { api?: import('../../verify/component-apis.js').ComponentApi, deprecated?: import('../../verify/deprecations.js').DeprecationNotice, native?: string }>} found
 */
function ingestDsContract(doc, file, found) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return;
  const raw = /** @type {Record<string, unknown>} */ (doc);
  const name = toAllowlistName(
    (typeof raw.name === 'string' && raw.name) ||
      (typeof raw.id === 'string' && raw.id) ||
      stemName(file),
  );
  if (!name || found.has(name)) return;

  /** @type {Record<string, { enum?: string[], type?: 'boolean' | 'string' | 'number' }>} */
  const props = {};
  if (Array.isArray(raw.props)) {
    for (const item of raw.props) {
      const mapped = mapDsProp(item);
      if (mapped) props[mapped.name] = mapped.def;
    }
  }

  /** @type {import('../../verify/component-apis.js').ComponentApi | undefined} */
  let api;
  if (Object.keys(props).length > 0) {
    api = { props };
  }

  const deprecated = dsDeprecation(raw);
  const native = dsNativeTag(raw);
  found.set(name, { api, deprecated, native });
}

/**
 * @param {unknown} item
 * @returns {{ name: string, def: { enum?: string[], type?: 'boolean' | 'string' | 'number' } } | null}
 */
function mapDsProp(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const raw = /** @type {Record<string, unknown>} */ (item);
  const bindings =
    raw.bindings && typeof raw.bindings === 'object' && !Array.isArray(raw.bindings)
      ? /** @type {Record<string, unknown>} */ (raw.bindings)
      : {};
  const code =
    bindings.code && typeof bindings.code === 'object' && !Array.isArray(bindings.code)
      ? /** @type {Record<string, unknown>} */ (bindings.code)
      : {};
  const jsxName =
    (typeof code.prop === 'string' && code.prop) ||
    (typeof raw.name === 'string' && raw.name) ||
    '';
  if (!jsxName || isPassthroughProp(jsxName)) return null;
  if (raw.type === 'text') return null;

  let defInput = raw;
  if (raw.type && typeof raw.type === 'object' && !Array.isArray(raw.type)) {
    defInput = /** @type {Record<string, unknown>} */ (raw.type);
  } else if (raw.type === 'boolean' || raw.type === 'string' || raw.type === 'number') {
    defInput = { type: raw.type };
  }
  if (defInput.arrayOf !== undefined) return null;

  const def = mapJudgeProp(jsxName, defInput);
  if (!def) return null;
  return { name: jsxName, def };
}

/**
 * @param {Record<string, unknown>} raw
 */
function dsDeprecation(raw) {
  if (raw.status !== 'deprecated') return undefined;
  /** @type {import('../../verify/deprecations.js').DeprecationNotice} */
  const notice = {
    reason:
      typeof raw.description === 'string' && raw.description.length > 0
        ? raw.description
        : 'Deprecated in DS contract',
  };
  if (typeof raw.replacement === 'string' && raw.replacement.length > 0) {
    notice.replacement = raw.replacement;
  }
  return notice;
}

/**
 * @param {Record<string, unknown>} raw
 */
function dsNativeTag(raw) {
  const semantics =
    raw.semantics && typeof raw.semantics === 'object' && !Array.isArray(raw.semantics)
      ? /** @type {Record<string, unknown>} */ (raw.semantics)
      : {};
  const element =
    typeof semantics.element === 'string' ? semantics.element.toLowerCase() : '';
  return NATIVE_TAGS.has(element) ? element : undefined;
}
