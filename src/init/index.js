import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { validateContract } from '../contract/index.js';
import {
  extractComponents,
  extractTokens,
  inferNativeElementMap,
} from './extract.js';
import { resolvePackageRoot } from './resolve.js';

export { resolvePackageRoot } from './resolve.js';

/**
 * @typedef {import('../contract/index.js').DecreeContract} DecreeContract
 */

/**
 * @param {string} packageRoot
 * @returns {DecreeContract & { package?: string, name?: string }}
 */
export function buildContractFromPackage(packageRoot) {
  const pkg = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  );
  const components = extractComponents(packageRoot);
  if (components.length === 0) {
    throw new Error(
      `No components found in ${packageRoot}. Expected PascalCase exports (e.g. Button.js).`,
    );
  }
  const tokens = extractTokens(packageRoot);
  const nativeElementMap = inferNativeElementMap(components);
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
  validateContract(contract);
  return contract;
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
