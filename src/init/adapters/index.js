import { validateContract } from '../../contract/index.js';
import { buildContractFromDsContracts } from './ds-contracts.js';
import { buildContractFromSpecs } from './specs.js';

export { buildContractFromDsContracts } from './ds-contracts.js';
export { buildContractFromSpecs } from './specs.js';

/**
 * @param {'specs' | 'ds-contracts'} kind
 * @param {string} inputRoot
 * @param {{ name?: string }} [opts]
 */
export function buildContractFromExternal(kind, inputRoot, opts = {}) {
  const contract =
    kind === 'specs'
      ? buildContractFromSpecs(inputRoot, opts)
      : buildContractFromDsContracts(inputRoot, opts);
  validateContract(contract);
  return contract;
}
