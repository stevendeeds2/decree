import { basename, dirname } from 'node:path';
import { isPassthroughProp } from '../../verify/component-apis.js';
import {
  collectTokenEntries,
  contractIdentity,
  isDocumentFile,
  isTokenFile,
  loadDocument,
  mapJudgeProp,
  nativeMapFor,
  noteExamples,
  noteRef,
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
 * Compile a Decree judge slice from DS Contracts files.
 * Maps names, props/enums, tokens, deprecations. Leaves anatomy, layout, and styles behind.
 * Everything the adapter cannot read is reported on `opts.notes`, never dropped silently.
 *
 * @param {string} inputRoot
 * @param {{ name?: string, notes?: string[] }} [opts]
 */
export function buildContractFromDsContracts(inputRoot, opts = {}) {
  const root = resolveInputRoot(inputRoot);
  const notes = opts.notes;
  /** @type {Map<string, { api?: import('../../verify/component-apis.js').ComponentApi, deprecated?: import('../../verify/deprecations.js').DeprecationNotice, native?: string }>} */
  const found = new Map();
  /** @type {string[]} */
  const ignoredDocs = [];

  const files = isDocumentFile(root) ? [root] : walkFiles(root);
  for (const file of files) {
    if (!isDsContractFile(file)) {
      if (isIgnorableCandidate(file)) ignoredDocs.push(noteRef(root, file));
      continue;
    }
    const doc = loadDocument(file);
    ingestDsContract(doc, noteRef(root, file), found, notes);
  }

  const components = [...found.keys()].sort((a, b) => a.localeCompare(b));
  if (components.length === 0) {
    const seen = ignoredDocs.length
      ? ` Saw ${ignoredDocs.length} document file(s) that do not match the naming convention: ${noteExamples(ignoredDocs)} — rename to *.contract.json or point at the directory that holds the exports.`
      : '';
    throw new Error(
      `No DS Contracts found in ${root}. Expected *.contract.json (or .contract.yaml) files with id/name and props.${seen}`,
    );
  }
  if (notes && ignoredDocs.length > 0) {
    notes.push(
      `${ignoredDocs.length} document file(s) ignored (not named *.contract.json): ${noteExamples(ignoredDocs)}`,
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
  if (base === 'decree.contract.json') return false;
  return base.endsWith('.contract.json') || base.endsWith('.contract.yaml') || base.endsWith('.contract.yml');
}

const IGNORE_AS_CANDIDATE = new Set([
  'package.json',
  'package-lock.json',
  'decree.contract.json',
  'decree.sources.json',
  'decree.baseline.json',
]);

/**
 * A document file worth mentioning when it does not match the naming convention.
 * @param {string} file
 */
function isIgnorableCandidate(file) {
  if (!isDocumentFile(file)) return false;
  const base = basename(file).toLowerCase();
  if (IGNORE_AS_CANDIDATE.has(base)) return false;
  if (base.includes('schema') || base.startsWith('tsconfig')) return false;
  return !isTokenFile(file);
}

/**
 * @param {unknown} doc
 * @param {string} ref
 * @param {Map<string, { api?: import('../../verify/component-apis.js').ComponentApi, deprecated?: import('../../verify/deprecations.js').DeprecationNotice, native?: string }>} found
 * @param {string[]} [notes]
 */
function ingestDsContract(doc, ref, found, notes) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    notes?.push(
      `${ref}: not a single contract object — arrays and multi-component files are not read`,
    );
    return;
  }
  const raw = /** @type {Record<string, unknown>} */ (doc);
  const name = toAllowlistName(
    (typeof raw.name === 'string' && raw.name) ||
      (typeof raw.id === 'string' && raw.id) ||
      stemName(ref),
  );
  if (!name) {
    notes?.push(`${ref}: no usable name or id`);
    return;
  }
  if (found.has(name)) return;

  /** @type {Record<string, { enum?: string[], type?: 'boolean' | 'string' | 'number' }>} */
  const props = {};
  if (Array.isArray(raw.props)) {
    for (const item of raw.props) {
      const mapped = mapDsProp(item, (reason) =>
        notes?.push(`${name}: ${reason}`),
      );
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

/** Prop kinds the adapter leaves behind on purpose — no note needed. */
const BY_DESIGN_PROP_KINDS = new Set(['text', 'slot', 'image']);

/**
 * @param {unknown} item
 * @param {(reason: string) => void} [onSkip]
 * @returns {{ name: string, def: { enum?: string[], type?: 'boolean' | 'string' | 'number' } } | null}
 */
function mapDsProp(item, onSkip) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    onSkip?.('prop entry is not an object');
    return null;
  }
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
  if (!jsxName) {
    onSkip?.('prop without a name (expected name or bindings.code.prop)');
    return null;
  }
  if (isPassthroughProp(jsxName)) return null;
  if (typeof raw.type === 'string' && BY_DESIGN_PROP_KINDS.has(raw.type)) {
    return null;
  }

  let defInput = raw;
  if (raw.type && typeof raw.type === 'object' && !Array.isArray(raw.type)) {
    defInput = /** @type {Record<string, unknown>} */ (raw.type);
  } else if (raw.type === 'boolean' || raw.type === 'string' || raw.type === 'number') {
    defInput = { type: raw.type };
  }
  if (defInput.arrayOf !== undefined) return null;

  const def = mapJudgeProp(jsxName, defInput);
  if (!def) {
    const kind = typeof defInput.type === 'string' ? defInput.type : undefined;
    if (!kind || !BY_DESIGN_PROP_KINDS.has(kind)) {
      onSkip?.(
        `prop "${jsxName}" left behind (unsupported shape — expected enum/values or a boolean/string/number type)`,
      );
    }
    return null;
  }
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
