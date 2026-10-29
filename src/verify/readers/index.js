/**
 * Markup readers. Each syntax (JSX, tagged templates, Vue, Svelte, Angular)
 * turns a file into the same list of tags, so every check runs the same way
 * no matter how the app writes its UI.
 */

import { extractJsxTagsFromAst, parseScript } from '../ast-scan.js';
import { extractTaggedTemplateTags } from './tagged-template.js';

export const SCRIPT_EXT = /\.(tsx|jsx|ts|js|mjs|cjs)$/;

/**
 * @typedef {(source: string, file: string, options: ReaderOptions) => { tags: import('../ast-scan.js').JsxTag[], ok: boolean }} MarkupReader
 * @typedef {{ templateTags?: string[] }} ReaderOptions
 */

/** @type {{ test: RegExp, read: MarkupReader }[]} */
const TEMPLATE_READERS = [];

/**
 * Register a reader for a template file type (Vue, Svelte, Angular).
 * @param {RegExp} test
 * @param {MarkupReader} read
 */
export function registerTemplateReader(test, read) {
  TEMPLATE_READERS.push({ test, read });
}

/**
 * @param {string} file
 */
export function isTemplateFile(file) {
  return TEMPLATE_READERS.some((r) => r.test.test(file));
}

/**
 * @param {string} source
 * @param {string} file
 * @param {ReaderOptions} [options]
 * @returns {{ tags: import('../ast-scan.js').JsxTag[], ok: boolean }}
 */
export function readMarkup(source, file, options = {}) {
  if (SCRIPT_EXT.test(file)) {
    const ast = parseScript(source);
    if (!ast) return { tags: [], ok: false };
    const tags = [
      ...extractJsxTagsFromAst(ast),
      ...extractTaggedTemplateTags(ast, options),
    ];
    return { tags, ok: true };
  }
  for (const reader of TEMPLATE_READERS) {
    if (reader.test.test(file)) return reader.read(source, file, options);
  }
  return { tags: [], ok: true };
}
