/**
 * Template readers for Vue single-file components, Svelte components, and
 * Angular component templates. Each uses the framework's own parser and
 * returns the same tag shape as the JSX reader.
 */

import { parse as parseVue } from '@vue/compiler-sfc';
import { parse as parseSvelte } from 'svelte/compiler';
import { parseTemplate as parseAngular } from '@angular/compiler';
import { registerTemplateReader } from './index.js';

export const VUE_FILE = /\.vue$/;
export const SVELTE_FILE = /\.svelte$/;
export const ANGULAR_FILE = /\.component\.html$/;

/**
 * @typedef {import('../ast-scan.js').JsxTag} Tag
 * @typedef {import('../ast-scan.js').JsxAttr} Attr
 */

/**
 * @param {string} name
 * @returns {{ native: boolean, kind: 'component' | 'native' | 'element' }}
 */
function classify(name) {
  if (/^[A-Z]/.test(name)) return { native: false, kind: 'component' };
  if (name.includes('-')) return { native: false, kind: 'element' };
  return { native: true, kind: 'native' };
}

/** `ds-button` → `DsButton` */
function kebabToPascal(name) {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** `click` → `onClick` so event bindings pass as event props. */
function eventProp(name) {
  return `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/**
 * Literal value of a tiny expression: `'lg'`, `"lg"`, `3`, `true`.
 * @param {string | undefined} code
 * @returns {{ ok: true, value: string | number | boolean } | { ok: false }}
 */
function literalFromCode(code) {
  const text = (code ?? '').trim();
  const quoted = text.match(/^(['"`])([^'"`]*)\1$/);
  if (quoted) return { ok: true, value: quoted[2] };
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return { ok: true, value: Number(text) };
  if (text === 'true' || text === 'false') return { ok: true, value: text === 'true' };
  return { ok: false };
}

/**
 * @param {string} name
 * @param {string | undefined} code
 * @returns {Attr}
 */
function boundAttr(name, code) {
  const literal = literalFromCode(code);
  return literal.ok ? { name, literalValue: literal.value } : { name, dynamic: true };
}

// --- Vue ---------------------------------------------------------------

/** @type {import('./index.js').MarkupReader} */
export function readVue(source, file) {
  let descriptor;
  try {
    ({ descriptor } = parseVue(source, { filename: file }));
  } catch {
    return { tags: [], ok: false };
  }
  /** @type {Tag[]} */
  const tags = [];
  const root = descriptor.template?.ast;
  if (!root) return { tags, ok: true };

  /** @param {any} node */
  function walk(node) {
    // NodeTypes.ELEMENT === 1; ElementTypes.TEMPLATE === 3 (slots, v-if wrappers)
    if (node.type === 1 && node.tagType !== 3) {
      const attrs = [];
      let spread = false;
      for (const prop of node.props || []) {
        if (prop.type === 6) {
          attrs.push({ name: prop.name, literalValue: prop.value ? prop.value.content : true });
          continue;
        }
        if (prop.type !== 7) continue;
        const arg = prop.arg?.isStatic ? prop.arg.content : null;
        if (prop.name === 'bind') {
          if (!arg) spread = true;
          else attrs.push(boundAttr(arg, prop.exp?.content));
        } else if (prop.name === 'on' && arg) {
          attrs.push({ name: eventProp(arg), dynamic: true });
        }
      }
      const tag = node.tag;
      const { native, kind } = node.tagType === 1 ? { native: false, kind: /^[A-Z]/.test(tag) ? 'component' : 'element' } : classify(tag);
      tags.push({
        name: tag,
        line: node.loc?.start?.line ?? 1,
        native,
        kind: /** @type {'component' | 'native' | 'element'} */ (kind),
        attrs,
        spread,
        ...(kind === 'element' ? { pascalName: kebabToPascal(tag) } : {}),
      });
    }
    for (const child of node.children || []) walk(child);
  }

  walk(root);
  return { tags, ok: true };
}

// --- Svelte --------------------------------------------------------------

/**
 * @param {string} source
 * @returns {(offset: number) => number}
 */
function lineFinder(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * @param {any} value Svelte attribute value
 * @param {string} name
 * @returns {Attr}
 */
function svelteAttr(name, value) {
  if (value === true) return { name, literalValue: true };
  const parts = Array.isArray(value) ? value : [value];
  if (parts.every((p) => p?.type === 'Text')) {
    return { name, literalValue: parts.map((p) => p.data).join('') };
  }
  if (parts.length === 1 && parts[0]?.type === 'ExpressionTag') {
    const expr = parts[0].expression;
    if (expr?.type === 'Literal' && ['string', 'number', 'boolean'].includes(typeof expr.value)) {
      return { name, literalValue: expr.value };
    }
  }
  const stringLiterals = parts.filter((p) => p?.type === 'Text' && p.data.trim()).map((p) => p.data);
  return { name, dynamic: true, ...(stringLiterals.length ? { stringLiterals } : {}) };
}

/** @type {import('./index.js').MarkupReader} */
export function readSvelte(source) {
  let ast;
  try {
    ast = parseSvelte(source, { modern: true });
  } catch {
    return { tags: [], ok: false };
  }
  const lineOf = lineFinder(source);
  /** @type {Tag[]} */
  const tags = [];

  /** @param {any} node */
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Component' || node.type === 'RegularElement') {
      const attrs = [];
      let spread = false;
      for (const attr of node.attributes || []) {
        if (attr.type === 'SpreadAttribute') spread = true;
        else if (attr.type === 'OnDirective') attrs.push({ name: eventProp(attr.name), dynamic: true });
        else if (attr.type === 'Attribute') {
          const name = /^on[a-z]/.test(attr.name) ? eventProp(attr.name.slice(2)) : attr.name;
          attrs.push(svelteAttr(name, attr.value));
        }
      }
      const { native, kind } = node.type === 'Component' ? { native: false, kind: 'component' } : classify(node.name);
      tags.push({
        name: node.name,
        line: lineOf(node.start ?? 0),
        native,
        kind: /** @type {'component' | 'native' | 'element'} */ (kind),
        attrs,
        spread,
      });
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object' && value.type) walk(value);
    }
  }

  walk(ast.fragment);
  return { tags, ok: true };
}

// --- Angular -------------------------------------------------------------

/** Angular BindingType: 0 Property, 1 Attribute, 2 Class, 3 Style, 5 TwoWay */
function angularInputName(input) {
  if (input.type === 2) return 'class';
  if (input.type === 3) return 'style';
  return input.name;
}

/** @type {import('./index.js').MarkupReader} */
export function readAngular(source, file) {
  let result;
  try {
    result = parseAngular(source, file, { preserveWhitespaces: false });
  } catch {
    return { tags: [], ok: false };
  }
  /** @type {Tag[]} */
  const tags = [];
  const seen = new Set();

  /** @param {any} node */
  function walk(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (typeof node.name === 'string' && Array.isArray(node.attributes) && Array.isArray(node.inputs) && node.constructor?.name !== 'Template') {
      /** @type {Attr[]} */
      const attrs = [
        ...node.attributes.map((a) => ({ name: a.name, literalValue: a.value === '' ? true : a.value })),
        ...node.inputs.map((input) => boundAttr(angularInputName(input), input.value?.source)),
        ...(node.outputs || []).map((o) => ({ name: eventProp(o.name), dynamic: true })),
      ];
      const { native, kind } = classify(node.name);
      tags.push({
        name: node.name,
        line: (node.sourceSpan?.start?.line ?? 0) + 1,
        native,
        kind,
        attrs,
        spread: false,
      });
    }
    for (const key of ['children', 'branches', 'cases']) {
      for (const child of node[key] || []) walk(child);
    }
    for (const key of ['empty', 'placeholder', 'loading', 'error']) {
      if (node[key]) walk(node[key]);
    }
  }

  for (const node of result.nodes || []) walk(node);
  return { tags, ok: (result.errors || []).length === 0 || tags.length > 0 };
}

registerTemplateReader(VUE_FILE, readVue);
registerTemplateReader(SVELTE_FILE, readSvelte);
registerTemplateReader(ANGULAR_FILE, readAngular);
