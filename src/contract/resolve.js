import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadContract, validateContract } from './index.js';
import { resolvePackageRoot } from '../init/resolve.js';

const POINTER_KEYS = new Set(['version', 'designSystem', 'scan']);

/**
 * A copied allowlist is a decree.contract.json that still lists components.
 * Apps that already committed one keep working. New apps point at a package.
 * @param {unknown} raw
 */
export function isLegacyAllowlist(raw) {
  return Boolean(
    raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      Array.isArray(/** @type {{ components?: unknown }} */ (raw).components),
  );
}

/**
 * Judge against the contract shipped by the installed design system.
 * `scan` comes from the app file. Components, tokens, APIs, deprecations,
 * and restyle come from the package's `package.json` "decree" field.
 *
 * A file that already has a `components` array is the old copied allowlist
 * and is used as-is.
 *
 * @param {string} contractPath
 */
export function loadProjectContract(contractPath) {
  const abs = resolve(contractPath);
  const projectRoot = dirname(abs);
  let raw;
  try {
    raw = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (err) {
    throw new Error(
      `Invalid decree contract at ${abs}: ${err instanceof Error ? err.message : err}`,
    );
  }

  if (isLegacyAllowlist(raw)) {
    validateContract(raw);
    return {
      contract: /** @type {import('./index.js').DecreeContract} */ (raw),
      contractPath: abs,
      projectRoot,
      legacyAllowlist: true,
      designSystem: null,
      packageContractPath: null,
    };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Decree contract must be an object');
  }
  const pointer = /** @type {Record<string, unknown>} */ (raw);
  for (const key of Object.keys(pointer)) {
    if (!POINTER_KEYS.has(key)) {
      throw new Error(
        `decree.contract.json points at a design system, so it cannot set "${key}". ` +
          'Components, tokens, and the rest of the allowlist come from the installed package. ' +
          'A file with a components list is the old copied allowlist.',
      );
    }
  }
  if (pointer.version !== undefined && pointer.version !== 1) {
    throw new Error(`Unsupported Decree contract version: ${String(pointer.version)}`);
  }
  if (typeof pointer.designSystem !== 'string' || !pointer.designSystem) {
    throw new Error(
      'decree.contract.json must name a designSystem package, or be a full contract with a components list (the old copied allowlist).',
    );
  }

  const packageRoot = resolvePackageRoot(pointer.designSystem, projectRoot);
  const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const decreeField = typeof pkg.decree === 'string' ? pkg.decree : './decree.contract.json';
  const packageContractPath = resolve(packageRoot, decreeField);
  if (!existsSync(packageContractPath)) {
    throw new Error(
      `No decree contract in ${packageRoot} (looked for ${decreeField}). DS packages should ship decree.contract.json.`,
    );
  }

  const installed = loadContract(packageContractPath);
  /** @type {import('./index.js').DecreeContract} */
  const contract = { ...installed };
  if (pointer.scan === undefined) {
    delete contract.scan;
  } else {
    contract.scan = /** @type {import('./index.js').DecreeScanConfig} */ (pointer.scan);
  }
  validateContract(contract);

  return {
    contract,
    contractPath: abs,
    projectRoot,
    legacyAllowlist: false,
    designSystem: pointer.designSystem,
    packageContractPath,
  };
}
