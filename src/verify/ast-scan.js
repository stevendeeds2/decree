import parser from '@babel/parser';

/**
 * @typedef {{
 *   name: string,
 *   literalValue?: string | boolean | number,
 *   dynamic?: boolean,
 * }} JsxAttr
 * @typedef {{
 *   name: string,
 *   line: number,
 *   native: boolean,
 *   attrs: JsxAttr[],
 *   spread: boolean,
 * }} JsxTag
 */

/**
 * @param {string} source
 * @param {string} file
 * @returns {{ tags: JsxTag[], ok: boolean }}
 */
export function extractJsxTags(source, file) {
  let ast;
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
      allowReturnOutsideFunction: true,
    });
  } catch {
    return { tags: [], ok: false };
  }

  /** @type {JsxTag[]} */
  const tags = [];

  /**
   * @param {import('@babel/parser').ParseResult<import('@babel/types').File> | any} node
   */
  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'JSXOpeningElement') {
      const info = jsxNameInfo(node.name);
      if (info) {
        const line = node.loc?.start?.line ?? 1;
        const { attrs, spread } = extractJsxAttrs(node);
        tags.push({
          name: info.name,
          line,
          native: info.native,
          attrs,
          spread,
        });
      }
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
  return { tags, ok: true };
}

/**
 * @param {any} nameNode
 * @returns {{ name: string, native: boolean } | null}
 */
function jsxNameInfo(nameNode) {
  if (!nameNode) return null;
  if (nameNode.type === 'JSXIdentifier') {
    const name = nameNode.name;
    if (!name) return null;
    // lowercase → intrinsic / native candidate; PascalCase → component
    const native = /^[a-z]/.test(name);
    return { name, native };
  }
  if (nameNode.type === 'JSXMemberExpression') {
    // <Foo.Bar> → enforce root Foo (same as legacy scanner)
    let root = nameNode;
    while (root && root.type === 'JSXMemberExpression') root = root.object;
    if (root?.type === 'JSXIdentifier' && /^[A-Z]/.test(root.name)) {
      return { name: root.name, native: false };
    }
  }
  return null;
}

/**
 * @param {any} opening
 * @returns {{ attrs: JsxAttr[], spread: boolean }}
 */
function extractJsxAttrs(opening) {
  /** @type {JsxAttr[]} */
  const attrs = [];
  let spread = false;
  const list = Array.isArray(opening.attributes) ? opening.attributes : [];
  for (const attr of list) {
    if (!attr) continue;
    if (attr.type === 'JSXSpreadAttribute') {
      spread = true;
      continue;
    }
    if (attr.type !== 'JSXAttribute') continue;
    const name = jsxAttrName(attr.name);
    if (!name) continue;
    if (attr.value == null) {
      attrs.push({ name, literalValue: true });
      continue;
    }
    const literal = literalFromJsxValue(attr.value);
    if (literal.ok) {
      attrs.push({ name, literalValue: literal.value });
    } else {
      attrs.push({ name, dynamic: true });
    }
  }
  return { attrs, spread };
}

/**
 * @param {any} nameNode
 * @returns {string | null}
 */
function jsxAttrName(nameNode) {
  if (!nameNode) return null;
  if (nameNode.type === 'JSXIdentifier') return nameNode.name ?? null;
  if (nameNode.type === 'JSXNamespacedName') {
    const ns = nameNode.namespace?.name;
    const name = nameNode.name?.name;
    if (typeof ns === 'string' && typeof name === 'string') {
      return `${ns}:${name}`;
    }
  }
  return null;
}

/**
 * @param {any} valueNode
 * @returns {{ ok: true, value: string | boolean | number } | { ok: false }}
 */
function literalFromJsxValue(valueNode) {
  if (!valueNode) return { ok: false };
  if (valueNode.type === 'StringLiteral') {
    return { ok: true, value: valueNode.value };
  }
  if (valueNode.type === 'JSXExpressionContainer') {
    return literalFromExpression(valueNode.expression);
  }
  return { ok: false };
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
  if (expr.type === 'BooleanLiteral') {
    return { ok: true, value: expr.value };
  }
  if (expr.type === 'UnaryExpression' && expr.operator === '-' && expr.argument) {
    const inner = literalFromExpression(expr.argument);
    if (inner.ok && typeof inner.value === 'number') {
      return { ok: true, value: -inner.value };
    }
  }
  return { ok: false };
}
