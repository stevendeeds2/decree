import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { validateContract } from '../contract/index.js';
import {
  canonicalizeDeprecations,
  hasDeprecationEntries,
} from '../verify/deprecations.js';
import {
  canonicalizeComponentApis,
  hasComponentApiEntries,
} from '../verify/component-apis.js';
import {
  extractComponents,
  extractTokens,
  inferNativeElementMap,
} from './extract.js';
import { resolvePackageRoot } from './resolve.js';
import {
  isComponentFileAllowed,
  loadSources,
} from './sources.js';

export { resolvePackageRoot } from './resolve.js';
export {
  loadSources,
  validateSources,
  sourcesScaffoldTemplate,
  writeSourcesScaffold,
} from './sources.js';


/**
 * @typedef {import('../contract/index.js').DecreeContract} DecreeContract
 * @typedef {import('./sources.js').DecreeSources} DecreeSources
 */

/**
 * @param {string} packageRoot
 * @param {{
 *   sources?: DecreeSources | null,
 *   sourcesPath?: string,
 * }} [options]
 * @returns {{
 *   contract: DecreeContract & { package?: string, name?: string },
 *   legacy: boolean,
 *   sourcesPath: string | null,
 * }}
 */
export function buildContractFromPackage(packageRoot, options = {}) {
  const pkg = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  );

  let sources = options.sources ?? null;
  let sourcesPath = null;
  let legacy = true;

  if (sources) {
    legacy = false;
  } else {
    const loaded = loadSources(packageRoot, options.sourcesPath);
    sources = loaded.sources;
    sourcesPath = loaded.path;
    legacy = loaded.legacy;
  }

  /** @type {((fileAbs: string) => boolean) | undefined} */
  let fileFilter;
  if (sources && !legacy) {
    fileFilter = (fileAbs) =>
      isComponentFileAllowed(packageRoot, fileAbs, sources);
  }

  const components = extractComponents(packageRoot, {
    fileFilter,
    ignoreComponentNames: sources?.ignoreComponentNames,
  });
  if (components.length === 0) {
    throw new Error(
      `No components found in ${packageRoot}. Expected PascalCase exports (e.g. Button.js).`,
    );
  }

  const tokens = extractTokens(packageRoot, {
    mode: sources?.tokens?.mode ?? 'legacy-scan',
    tokenFiles: sources?.tokens?.files,
    cssAllowlist: sources?.tokens?.cssAllowlist,
  });

  const nativeElementMap =
    sources?.nativeElementMap &&
    Object.keys(sources.nativeElementMap).length > 0
      ? sources.nativeElementMap
      : inferNativeElementMap(components);

  const name =
    typeof pkg.name === 'string' && pkg.name.length > 0
      ? pkg.name
      : 'decree-contract';

  /** @type {DecreeContract & { package?: string, name?: string }} */
  const contract = {
    version: 1,
    name,
    package: typeof pkg.name === 'string' ? pkg.name : undefined,
    components,
    tokens,
    nativeElementMap,
  };
  if (sources?.deprecations && hasDeprecationEntries(sources.deprecations)) {
    /** @type {NonNullable<DecreeContract['deprecations']>} */
    const deprecations = {};
    if (
      sources.deprecations.components &&
      Object.keys(sources.deprecations.components).length > 0
    ) {
      deprecations.components = sources.deprecations.components;
    }
    if (
      sources.deprecations.tokens &&
      Object.keys(sources.deprecations.tokens).length > 0
    ) {
      deprecations.tokens = sources.deprecations.tokens;
    }
    contract.deprecations = deprecations;
  }
  if (sources?.componentApis && hasComponentApiEntries(sources.componentApis)) {
    contract.componentApis = sources.componentApis;
  }
  validateContract(contract);
  return { contract, legacy, sourcesPath };
}

/**
 * @param {import('../contract/index.js').DecreeContract} contract
 * @param {string} outPath
 * @param {{ force?: boolean }} [opts]
 * @returns {{ written: boolean, path: string }}
 */
export function writeContract(contract, outPath, opts = {}) {
  validateContract(contract);
  if (existsSync(outPath) && !opts.force) {
    throw new Error(
      `Contract already exists at ${outPath}. Re-run with --force to overwrite.`,
    );
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  return { written: true, path: outPath };
}

/**
 * Stable shape for contract drift checks.
 * @param {DecreeContract} contract
 */
export function canonicalizeContract(contract) {
  const canonical = {
    version: contract.version,
    name: contract.name,
    package: /** @type {{ package?: string }} */ (contract).package,
    components: [...contract.components].sort(),
    tokens: [...contract.tokens]
      .map((t) => ({
        name: t.name,
        ...(t.value !== undefined ? { value: t.value } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    nativeElementMap: Object.fromEntries(
      Object.entries(contract.nativeElementMap || {}).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
  };
  const deprecations = canonicalizeDeprecations(contract.deprecations);
  const componentApis = canonicalizeComponentApis(contract.componentApis);
  return {
    ...canonical,
    ...(deprecations ? { deprecations } : {}),
    ...(componentApis ? { componentApis } : {}),
  };
}

/**
 * @param {DecreeContract} a
 * @param {DecreeContract} b
 */
export function contractsEqual(a, b) {
  return (
    JSON.stringify(canonicalizeContract(a)) ===
    JSON.stringify(canonicalizeContract(b))
  );
}

/**
 * Regenerate contract at package root from decree.sources.json.
 * @param {string} packageRoot
 * @param {{
 *   outPath?: string,
 *   force?: boolean,
 *   check?: boolean,
 *   sourcesPath?: string,
 * }} [opts]
 */
export function preparePackage(packageRoot, opts = {}) {
  const outPath = opts.outPath ?? join(packageRoot, 'decree.contract.json');
  const { contract, legacy, sourcesPath } = buildContractFromPackage(
    packageRoot,
    { sourcesPath: opts.sourcesPath },
  );

  if (opts.check) {
    if (!existsSync(outPath)) {
      return {
        ok: false,
        legacy,
        sourcesPath,
        message: `No contract at ${outPath} — run decree prepare first`,
        contract,
      };
    }
    const existing = JSON.parse(readFileSync(outPath, 'utf8'));
    validateContract(existing);
    const equal = contractsEqual(contract, existing);
    return {
      ok: equal,
      legacy,
      sourcesPath,
      message: equal
        ? `decree prepare --check: ok (${outPath})`
        : `decree prepare --check: contract drift at ${outPath} — re-run decree prepare`,
      contract,
      existing,
    };
  }

  const result = writeContract(contract, outPath, {
    force: opts.force !== false,
  });
  return {
    ok: true,
    legacy,
    sourcesPath,
    message: `decree prepare: wrote ${result.path}`,
    contract,
    path: result.path,
  };
}

/**
 * Copy published contract from a DS package into the consumer cwd.
 * @param {string} packageSpec path or package name
 * @param {string} fromCwd
 * @param {{ outPath?: string, force?: boolean }} [opts]
 */
export function usePackageContract(packageSpec, fromCwd, opts = {}) {
  const packageRoot = resolvePackageRoot(packageSpec, fromCwd);
  const pkg = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  );
  const decreeField =
    typeof pkg.decree === 'string' ? pkg.decree : './decree.contract.json';
  const sourceContract = resolve(packageRoot, decreeField);
  if (!existsSync(sourceContract)) {
    throw new Error(
      `No decree contract in ${packageRoot} (looked for ${decreeField}). DS packages should ship decree.contract.json.`,
    );
  }
  const contract = JSON.parse(readFileSync(sourceContract, 'utf8'));
  validateContract(contract);
  const outPath = opts.outPath ?? join(fromCwd, 'decree.contract.json');
  const result = writeContract(contract, outPath, { force: opts.force });
  return { ...result, from: sourceContract, packageRoot };
}
