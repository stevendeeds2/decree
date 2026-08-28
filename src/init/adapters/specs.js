import { basename, dirname } from 'node:path';
import { isPassthroughProp } from '../../verify/component-apis.js';
import {
  collectTokenEntries,
  contractIdentity,
  isDocumentFile,
  isTokenFile,
  loadDocument,
  mapForbiddenCombinations,
  mapJudgeProp,
  nativeMapFor,
  noteRef,
  resolveInputRoot,
  stemName,
  toAllowlistName,
  walkFiles,
  withKnownReplacement,
} from './shared.js';

/**
 * Compile a Decree judge slice from a Specs 2 catalog or component tree.
 * Maps names, props/enums, invalidVariantCombinations, tokens, deprecations.
 * Leaves anatomy, layout, variants, and styles behind.
 * Everything the adapter cannot read is reported on `opts.notes`, never dropped silently.
 *
 * @param {string} inputRoot
 * @param {{ name?: string, notes?: string[] }} [opts]
 */
export function buildContractFromSpecs(inputRoot, opts = {}) {
  const root = resolveInputRoot(inputRoot);
  const notes = opts.notes;
  /** @type {Map<string, { api?: import('../../verify/component-apis.js').ComponentApi, deprecated?: import('../../verify/deprecations.js').DeprecationNotice }>} */
  const found = new Map();
  /** @type {unknown[]} */
  const inlineTokens = [];

  const files = isDocumentFile(root) ? [root] : walkFiles(root);
  for (const file of files) {
    if (!isDocumentFile(file)) continue;
    if (isTokenFile(file)) continue;
    const base = basename(file).toLowerCase();
    if (base === 'package.json' || base.includes('schema')) continue;
    if (base.startsWith('decree.')) continue;
    const doc = loadDocument(file);
    ingestSpecsDocument(doc, noteRef(root, file), found, inlineTokens, notes);
  }

  const components = [...found.keys()].sort((a, b) => a.localeCompare(b));
  if (components.length === 0) {
    throw new Error(
      `No Specs components found in ${root}. Expected a catalog with components, or api.yaml / *.yaml files with title/props.`,
    );
  }

  /** @type {import('../../contract/index.js').DecreeContract['componentApis']} */
  const componentApis = {};
  /** @type {NonNullable<import('../../contract/index.js').DecreeContract['deprecations']>} */
  const deprecations = { components: {} };
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
  }

  const identity = contractIdentity(isDocumentFile(root) ? dirname(root) : root, opts);
  /** @type {import('../../contract/index.js').DecreeContract & { package?: string }} */
  const contract = {
    version: 1,
    name: identity.name,
    ...(identity.package ? { package: identity.package } : {}),
    components,
    tokens: collectTokenEntries(
      isDocumentFile(root) ? dirname(root) : root,
      inlineTokens,
    ),
    nativeElementMap: nativeMapFor(components),
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
 * @param {unknown} doc
 * @param {string} ref
 * @param {Map<string, { api?: import('../../verify/component-apis.js').ComponentApi, deprecated?: import('../../verify/deprecations.js').DeprecationNotice }>} found
 * @param {unknown[]} inlineTokens
 * @param {string[]} [notes]
 */
function ingestSpecsDocument(doc, ref, found, inlineTokens, notes) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    notes?.push(
      `${ref}: no Specs component recognized (need title/props/anatomy, or a components map)`,
    );
    return;
  }
  const raw = /** @type {Record<string, unknown>} */ (doc);
  if (raw.tokens !== undefined) inlineTokens.push(raw.tokens);

  if (isSpecsComponent(raw)) {
    addSpecsComponent(raw, fallbackName(raw, ref), found, notes);
    return;
  }

  const catalog =
    raw.components && typeof raw.components === 'object' && !Array.isArray(raw.components)
      ? /** @type {Record<string, unknown>} */ (raw.components)
      : looksLikeCatalog(raw)
        ? raw
        : null;
  if (!catalog) {
    if (raw.tokens === undefined) {
      notes?.push(
        `${ref}: no Specs component recognized (need title/props/anatomy, or a components map)`,
      );
    }
    return;
  }
  for (const [key, value] of Object.entries(catalog)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    addSpecsComponent(
      /** @type {Record<string, unknown>} */ (value),
      key,
      found,
      notes,
    );
  }
}

/**
 * @param {Record<string, unknown>} raw
 */
function isSpecsComponent(raw) {
  return (
    raw.props !== undefined ||
    raw.invalidVariantCombinations !== undefined ||
    typeof raw.title === 'string' ||
    raw.anatomy !== undefined
  );
}

/**
 * @param {Record<string, unknown>} raw
 */
function looksLikeCatalog(raw) {
  const keys = Object.keys(raw).filter((k) => k !== 'tokens' && k !== 'metadata');
  if (keys.length === 0) return false;
  return keys.every((key) => {
    const value = raw[key];
    return value && typeof value === 'object' && !Array.isArray(value) && isSpecsComponent(
      /** @type {Record<string, unknown>} */ (value),
    );
  });
}

/**
 * @param {Record<string, unknown>} raw
 * @param {string} fallback
 */
function fallbackName(raw, fallback) {
  if (typeof raw.title === 'string') return raw.title;
  return stemName(fallback);
}

/** Prop kinds the Specs adapter leaves behind on purpose — no note needed. */
const BY_DESIGN_PROP_KINDS = new Set(['slot', 'image', 'text']);

/**
 * @param {Record<string, unknown>} raw
 * @param {string} hintedName
 * @param {Map<string, { api?: import('../../verify/component-apis.js').ComponentApi, deprecated?: import('../../verify/deprecations.js').DeprecationNotice }>} found
 * @param {string[]} [notes]
 */
function addSpecsComponent(raw, hintedName, found, notes) {
  const name = toAllowlistName(
    typeof raw.title === 'string' ? raw.title : hintedName,
  );
  if (!name || found.has(name)) return;

  /** @type {Record<string, { enum?: string[], type?: 'boolean' | 'string' | 'number' }>} */
  const props = {};
  if (raw.props && typeof raw.props === 'object' && !Array.isArray(raw.props)) {
    for (const [propName, def] of Object.entries(
      /** @type {Record<string, unknown>} */ (raw.props),
    )) {
      const mapped = mapJudgeProp(propName, def);
      if (mapped) {
        props[propName] = mapped;
      } else if (shouldNoteSkippedProp(propName, def)) {
        notes?.push(
          `${name}: prop "${propName}" left behind (unsupported shape — expected enum/values or a boolean/string/number type)`,
        );
      }
    }
  }
  const forbiddenCombinations = mapForbiddenCombinations(
    props,
    raw.invalidVariantCombinations,
    (reason) =>
      notes?.push(`${name}: invalidVariantCombinations ${reason}`),
  );
  /** @type {import('../../verify/component-apis.js').ComponentApi | undefined} */
  let api;
  if (Object.keys(props).length > 0 || forbiddenCombinations) {
    api = {
      ...(Object.keys(props).length > 0 ? { props } : {}),
      ...(forbiddenCombinations ? { forbiddenCombinations } : {}),
    };
  }

  const deprecated = specsDeprecation(raw);
  found.set(name, { api, deprecated });
}

/**
 * Skips that deserve a note: not passthrough, not a by-design leave-behind.
 * @param {string} name
 * @param {unknown} def
 */
function shouldNoteSkippedProp(name, def) {
  if (isPassthroughProp(name)) return false;
  if (def && typeof def === 'object' && !Array.isArray(def)) {
    const kind = /** @type {Record<string, unknown>} */ (def).type;
    if (typeof kind === 'string' && BY_DESIGN_PROP_KINDS.has(kind)) return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {import('../../verify/deprecations.js').DeprecationNotice | undefined}
 */
function specsDeprecation(raw) {
  const metadata =
    raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
      ? /** @type {Record<string, unknown>} */ (raw.metadata)
      : {};
  const flagged =
    raw.deprecated === true ||
    metadata.deprecated === true ||
    metadata.status === 'deprecated';
  if (!flagged) return undefined;
  /** @type {import('../../verify/deprecations.js').DeprecationNotice} */
  const notice = { reason: 'Deprecated in Specs' };
  const replacement =
    (typeof raw.replacement === 'string' && raw.replacement) ||
    (typeof metadata.replacement === 'string' && metadata.replacement);
  if (replacement) notice.replacement = replacement;
  return notice;
}
