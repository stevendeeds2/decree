/**
 * Tagged-template markup reader: htm (`<${Button} …>`) and Lit-style
 * (`<sl-button …>`) templates inside `html` / `svg` tagged templates.
 * Returns the same tag shape as the JSX reader.
 */

/** Template tags read by default. `scan.templateTags` on the contract overrides. */
export const DEFAULT_TEMPLATE_TAGS = Object.freeze(['html', 'svg']);

const SENTINEL = '\u0001';
const TAG_NAME_RE = /^[A-Za-z][\w:.-]*/;

/**
 * @param {any} ast Babel File AST
 * @param {{ templateTags?: string[] }} [options]
 * @returns {import('../ast-scan.js').JsxTag[]}
 */
export function extractTaggedTemplateTags(ast, options = {}) {
  const names = new Set(options.templateTags ?? DEFAULT_TEMPLATE_TAGS);
  /** @type {import('../ast-scan.js').JsxTag[]} */
  const tags = [];

  /** @param {any} node */
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'TaggedTemplateExpression' && isTemplateTag(node.tag, names)) {
      tags.push(...readTemplate(node.quasi));
    }
    for (const value of Object.values(node)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        for (const child of value) walk(child);
      } else if (typeof value === 'object' && value.type) {
        walk(value);
      }
    }
  }

  walk(ast);
  return tags;
}

/**
 * `html`, `svg`, or `lit.html` style member tags.
 * @param {any} tag
 * @param {Set<string>} names
 */
function isTemplateTag(tag, names) {
  if (!tag) return false;
  if (tag.type === 'Identifier') return names.has(tag.name);
  if (tag.type === 'MemberExpression' && !tag.computed) {
    return tag.property?.type === 'Identifier' && names.has(tag.property.name);
  }
  return false;
}

/**
 * Flatten a template literal into one string with sentinel-wrapped
 * expression indexes, plus a line number for every character.
 * @param {any} quasi TemplateLiteral
 */
function flatten(quasi) {
  let text = '';
  /** @type {number[]} */
  const lines = [];
  const quasis = quasi.quasis || [];
  const expressions = quasi.expressions || [];
  for (let i = 0; i < quasis.length; i++) {
    const q = quasis[i];
    const raw = q.value?.raw ?? '';
    let line = q.loc?.start?.line ?? 1;
    for (const ch of raw) {
      text += ch;
      lines.push(line);
      if (ch === '\n') line += 1;
    }
    if (i < expressions.length) {
      const exprLine = expressions[i].loc?.start?.line ?? line;
      const token = `${SENTINEL}${i}${SENTINEL}`;
      for (const ch of token) {
        text += ch;
        lines.push(exprLine);
      }
    }
  }
  return { text, lines, expressions };
}

/**
 * @param {string} text
 * @param {number} at index of a sentinel
 * @returns {{ index: number, end: number } | null}
 */
function readSentinel(text, at) {
  if (text[at] !== SENTINEL) return null;
  const close = text.indexOf(SENTINEL, at + 1);
  if (close === -1) return null;
  const index = Number(text.slice(at + 1, close));
  if (!Number.isInteger(index)) return null;
  return { index, end: close + 1 };
}

/**
 * @param {any} quasi
 * @returns {import('../ast-scan.js').JsxTag[]}
 */
function readTemplate(quasi) {
  const { text, lines, expressions } = flatten(quasi);
  /** @type {import('../ast-scan.js').JsxTag[]} */
  const tags = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] !== '<') {
      i += 1;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    if (text[i + 1] === '/' || text[i + 1] === '!') {
      const end = text.indexOf('>', i + 1);
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    const line = lines[i] ?? 1;
    let cursor = i + 1;
    /** @type {{ name: string, native: boolean, kind: 'component' | 'native' | 'element' } | null} */
    let info = null;

    const sentinel = readSentinel(text, cursor);
    if (sentinel) {
      const name = componentNameFromExpression(expressions[sentinel.index]);
      if (name) info = { name, native: false, kind: 'component' };
      cursor = sentinel.end;
    } else {
      const match = text.slice(cursor).match(TAG_NAME_RE);
      if (!match) {
        i += 1;
        continue;
      }
      const name = match[0];
      cursor += name.length;
      info = classifyLiteralTag(name);
    }

    const { attrs, spread, end } = readAttributes(text, cursor, expressions);
    if (info) {
      tags.push({ name: info.name, line, native: info.native, kind: info.kind, attrs, spread });
    }
    i = end;
  }
  return tags;
}

/**
 * @param {string} name
 * @returns {{ name: string, native: boolean, kind: 'component' | 'native' | 'element' }}
 */
function classifyLiteralTag(name) {
  if (/^[A-Z]/.test(name)) return { name, native: false, kind: 'component' };
  if (name.includes('-')) return { name, native: false, kind: 'element' };
  return { name, native: true, kind: 'native' };
}

/**
 * `<${Button}>` → Button; `<${UI.Button}>` → UI (root, same as JSX).
 * @param {any} expr
 * @returns {string | null}
 */
function componentNameFromExpression(expr) {
  if (!expr) return null;
  if (expr.type === 'Identifier') return /^[A-Z]/.test(expr.name) ? expr.name : null;
  if (expr.type === 'MemberExpression') {
    let root = expr;
    while (root?.type === 'MemberExpression') root = root.object;
    if (root?.type === 'Identifier' && /^[A-Z]/.test(root.name)) return root.name;
  }
  return null;
}

/**
 * Lit binding prefixes: `.prop`, `?attr`, `@event`.
 * @param {string} raw
 */
function normalizeAttrName(raw) {
  if (raw.startsWith('.') || raw.startsWith('?')) return raw.slice(1);
  if (raw.startsWith('@')) {
    const event = raw.slice(1);
    return `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
  }
  return raw;
}

/**
 * @param {string} text
 * @param {number} start
 * @param {any[]} expressions
 * @returns {{ attrs: import('../ast-scan.js').JsxAttr[], spread: boolean, end: number }}
 */
function readAttributes(text, start, expressions) {
  /** @type {import('../ast-scan.js').JsxAttr[]} */
  const attrs = [];
  let spread = false;
  let i = start;

  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i += 1;
    if (i >= text.length) break;
    if (text[i] === '>') return { attrs, spread, end: i + 1 };
    if (text[i] === '/' && text[i + 1] === '>') return { attrs, spread, end: i + 2 };

    if (text.startsWith('...', i)) {
      const s = readSentinel(text, i + 3);
      spread = true;
      i = s ? s.end : i + 3;
      continue;
    }

    const bare = readSentinel(text, i);
    if (bare) {
      // `<div ${ref(x)}>` element directive; nothing static to judge.
      i = bare.end;
      continue;
    }

    let nameEnd = i;
    while (nameEnd < text.length && !/[\s=>]/.test(text[nameEnd])) {
      if (text[nameEnd] === '/' && text[nameEnd + 1] === '>') break;
      nameEnd += 1;
    }
    const rawName = text.slice(i, nameEnd);
    i = nameEnd;
    if (!rawName) {
      i += 1;
      continue;
    }
    const name = normalizeAttrName(rawName);

    while (i < text.length && /\s/.test(text[i])) i += 1;
    if (text[i] !== '=') {
      attrs.push({ name, literalValue: true });
      continue;
    }
    i += 1;
    while (i < text.length && /\s/.test(text[i])) i += 1;

    const quote = text[i] === '"' || text[i] === "'" ? text[i] : null;
    let value = '';
    if (quote) {
      const close = text.indexOf(quote, i + 1);
      value = text.slice(i + 1, close === -1 ? text.length : close);
      i = close === -1 ? text.length : close + 1;
    } else {
      let end = i;
      while (end < text.length && !/[\s>]/.test(text[end])) {
        if (text[end] === '/' && text[end + 1] === '>') break;
        end += 1;
      }
      value = text.slice(i, end);
      i = end;
    }
    attrs.push(attrFromValue(name, value, expressions));
  }
  return { attrs, spread, end: text.length };
}

/**
 * @param {string} name
 * @param {string} value
 * @param {any[]} expressions
 * @returns {import('../ast-scan.js').JsxAttr}
 */
function attrFromValue(name, value, expressions) {
  if (!value.includes(SENTINEL)) return { name, literalValue: value };

  const only = readSentinel(value, 0);
  if (only && only.end === value.length) {
    const literal = literalFromExpression(expressions[only.index]);
    if (literal.ok) return { name, literalValue: literal.value };
    const stringLiterals = collectStrings(expressions[only.index]);
    return { name, dynamic: true, ...(stringLiterals.length ? { stringLiterals } : {}) };
  }

  /** @type {string[]} */
  const stringLiterals = [];
  for (const part of value.split(new RegExp(`${SENTINEL}\\d+${SENTINEL}`))) {
    if (part.trim()) stringLiterals.push(part);
  }
  return { name, dynamic: true, ...(stringLiterals.length ? { stringLiterals } : {}) };
}

/**
 * @param {any} expr
 * @returns {{ ok: true, value: string | boolean | number } | { ok: false }}
 */
function literalFromExpression(expr) {
  if (!expr) return { ok: false };
  if (expr.type === 'StringLiteral' || expr.type === 'NumericLiteral') {
    return { ok: true, value: expr.value };
  }
  if (expr.type === 'BooleanLiteral') return { ok: true, value: expr.value };
  if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
    return { ok: true, value: expr.quasis[0]?.value?.cooked ?? '' };
  }
  return { ok: false };
}

/**
 * @param {any} node
 * @param {string[]} [out]
 */
function collectStrings(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.type === 'StringLiteral' && typeof node.value === 'string') {
    out.push(node.value);
    return out;
  }
  for (const value of Object.values(node)) {
    if (!value) continue;
    if (Array.isArray(value)) for (const child of value) collectStrings(child, out);
    else if (typeof value === 'object' && value.type) collectStrings(value, out);
  }
  return out;
}
