import { scanSource } from '../verify/scan.js';
import { CODES } from '../verify/codes.js';
import {
  deprecationPublicFields,
  formatDeprecatedComponentMessage,
  getComponentDeprecation,
  getTokenDeprecation,
} from '../verify/deprecations.js';
import {
  getComponentApi,
  publicComponentApi,
} from '../verify/component-apis.js';

/** Soft cap so MCP validate_snippet cannot become a CPU sink. */
export const MAX_SNIPPET_CHARS = 256_000;

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 */
export function listPrimitives(contract) {
  return contract.components.map((name) => {
    const notice = getComponentDeprecation(contract, name);
    const api = getComponentApi(contract, name);
    const props = api ? publicComponentApi(api) : undefined;
    if (notice) {
      return {
        name,
        kind: 'component',
        allowed: true,
        deprecated: true,
        deprecation: deprecationPublicFields(notice),
        ...(props && Object.keys(props).length > 0 ? { api: props } : {}),
      };
    }
    return {
      name,
      kind: 'component',
      allowed: true,
      deprecated: false,
      ...(props && Object.keys(props).length > 0 ? { api: props } : {}),
    };
  });
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 */
export function listTokens(contract) {
  return contract.tokens.map((t) => {
    const notice = getTokenDeprecation(contract, t.name);
    if (notice) {
      return {
        name: t.name,
        value: t.value ?? null,
        kind: 'token',
        allowed: true,
        deprecated: true,
        deprecation: deprecationPublicFields(notice),
      };
    }
    return {
      name: t.name,
      value: t.value ?? null,
      kind: 'token',
      allowed: true,
      deprecated: false,
    };
  });
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} name
 * @param {{ localComponents?: Set<string> }} [options]
 */
export function isAllowedPrimitive(contract, name, options = {}) {
  if (contract.components.includes(name)) return true;
  if (options.localComponents?.has(name)) return true;
  return false;
}

/**
 * Allowlist check plus deprecation notice for MCP JSON.
 * Deprecated contract names stay allowed (they are still in the system).
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} name
 * @param {{ localComponents?: Set<string> }} [options]
 */
export function describeAllowedPrimitive(contract, name, options = {}) {
  const allowed = isAllowedPrimitive(contract, name, options);
  const notice = getComponentDeprecation(contract, name);
  const deprecated = Boolean(notice);
  /** @type {string} */
  let message;
  if (!allowed) {
    message = `${name} is NOT allowlisted. Do not invent it — use list_primitives.`;
  } else if (notice) {
    message = `${name} is allowlisted but deprecated. ${formatDeprecatedComponentMessage(name, notice)} Do not use for new UI.`;
  } else {
    message = `${name} is allowlisted.`;
  }
  const api = getComponentApi(contract, name);
  const props = api ? publicComponentApi(api) : undefined;
  return {
    allowed,
    deprecated,
    ...(notice ? { deprecation: deprecationPublicFields(notice) } : {}),
    ...(props && Object.keys(props).length > 0 ? { api: props } : {}),
    message,
  };
}

/**
 * Validate a code snippet against the contract (same scanners as CI).
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} source
 * @param {string} [file]
 * @param {{ localComponents?: Set<string> }} [options]
 */
export function validateSnippet(
  contract,
  source,
  file = 'snippet.tsx',
  options = {},
) {
  if (typeof source !== 'string' || source.length > MAX_SNIPPET_CHARS) {
    return {
      ok: false,
      findings: [
        {
          code: CODES.SNIPPET_TOO_LARGE,
          message: `Snippet exceeds ${MAX_SNIPPET_CHARS} characters — refuse to scan`,
          file,
          line: 0,
        },
      ],
    };
  }
  const findings = scanSource(source, file, contract, {
    localComponents: options.localComponents,
  });
  return {
    ok: findings.length === 0,
    findings,
  };
}
