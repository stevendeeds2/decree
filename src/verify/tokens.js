const VAR_RE = /var\(\s*(--[A-Za-z0-9-_]+)\s*(?:,[^)]*)?\)/g;

/**
 * @param {string} text
 * @returns {string[]}
 */
export function extractCssVars(text) {
  /** @type {string[]} */
  const names = [];
  for (const m of text.matchAll(VAR_RE)) {
    names.push(m[1]);
  }
  return names;
}

/**
 * Collect var(--*) references from JS/TS string-like nodes via a light walk
 * of the Babel AST (string literals + template quasis).
 * @param {string} source
 * @param {(source: string) => { program?: any } | null} parseFn
 * @returns {{ name: string, line: number }[]}
 */
export function extractCssVarsFromJs(source, parseFn) {
  const ast = parseFn(source);
  if (!ast) return [];

  /** @type {{ name: string, line: number }[]} */
  const out = [];

  /**
   * @param {any} node
   */
  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'StringLiteral' && typeof node.value === 'string') {
      const line = node.loc?.start?.line ?? 1;
      for (const name of extractCssVars(node.value)) {
        out.push({ name, line });
      }
    }
    if (node.type === 'TemplateElement' && node.value?.raw != null) {
      const line = node.loc?.start?.line ?? 1;
      for (const name of extractCssVars(String(node.value.raw))) {
        out.push({ name, line });
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
  return out;
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @returns {Set<string>}
 */
export function tokenNameSet(contract) {
  return new Set(
    (contract.tokens || [])
      .map((t) => t?.name)
      .filter((n) => typeof n === 'string' && n.startsWith('--')),
  );
}
