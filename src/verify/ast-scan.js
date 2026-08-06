import parser from '@babel/parser';

/**
 * @typedef {{ name: string, line: number, native: boolean }} JsxTag
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
        tags.push({ name: info.name, line, native: info.native });
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
