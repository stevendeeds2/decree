#!/usr/bin/env node
/**
 * Together prototype: Specs 2 + DS Contracts → Decree judge.
 * Run from repo root: node demos/together/prove.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  buildContractFromDsContracts,
  buildContractFromSpecs,
  canonicalizeContract,
  contractsEqual,
  mergeExternalContracts,
} from '../../src/init/index.js';
import { validateContract } from '../../src/contract/index.js';
import { verifyPath } from '../../src/verify/index.js';
import { listPrimitives, validateSnippet } from '../../src/mcp/allowlist.js';
import { CODES } from '../../src/verify/codes.js';

const root = join(dirname(fileURLToPath(import.meta.url)));
const repo = join(root, '../..');
const outDir = join(root, 'out');
mkdirSync(outDir, { recursive: true });

const fromSpecs = buildContractFromSpecs(join(root, 'specs'), {
  name: '@demo/harbor-ui',
});
const fromDs = buildContractFromDsContracts(join(root, 'ds-contracts'), {
  name: '@demo/harbor-ui',
});

assertNoAuthoringLeak(fromSpecs, 'Specs');
assertNoAuthoringLeak(fromDs, 'DS Contracts');

if (!fromSpecs.componentApis?.Button?.forbiddenCombinations) {
  fail('Specs compile must carry invalidVariantCombinations as forbiddenCombinations');
}
if (fromDs.nativeElementMap?.button !== 'Button') {
  fail('DS Contracts compile must map native <button> → Button');
}

// Product merge; restyle is Harbor's own policy on top of it.
const merged = mergeExternalContracts(fromSpecs, fromDs, {
  name: '@demo/harbor-ui',
});
const contract = { ...merged, restyle: true };
validateContract(contract);
writeFileSync(
  join(outDir, 'from-specs.contract.json'),
  `${JSON.stringify(canonicalizeContract(fromSpecs), null, 2)}\n`,
);
writeFileSync(
  join(outDir, 'from-ds-contracts.contract.json'),
  `${JSON.stringify(canonicalizeContract(fromDs), null, 2)}\n`,
);
writeFileSync(
  join(outDir, 'harbor.contract.json'),
  `${JSON.stringify(contract, null, 2)}\n`,
);
for (const app of ['clean', 'dirty']) {
  writeFileSync(
    join(root, 'apps', app, 'decree.contract.json'),
    `${JSON.stringify(contract, null, 2)}\n`,
  );
}

const clean = verifyPath(join(root, 'apps/clean'));
if (!clean.ok || clean.findings.length !== 0) {
  fail(`clean checkout must pass, got ${JSON.stringify(clean.findings, null, 2)}`);
}

const dirty = verifyPath(join(root, 'apps/dirty'));
if (dirty.ok) fail('dirty checkout must fail');
const codes = new Set(dirty.findings.map((f) => f.code));
for (const code of [
  CODES.INVALID_PROP_VALUE,
  CODES.INVALID_PROP_COMBO,
  CODES.RESTYLE_STYLE,
  CODES.DEPRECATED_COMPONENT,
  CODES.UNKNOWN_COMPONENT,
  CODES.NATIVE_ELEMENT,
]) {
  if (!codes.has(code)) {
    fail(`dirty checkout missing ${code}: ${[...codes].join(', ')}`);
  }
}

const listed = listPrimitives(contract);
if (!listed.some((p) => p.name === 'Button' && p.api?.props?.variant)) {
  fail('MCP must list Button with variant enum');
}
if (!listed.some((p) => p.name === 'Ghost' && p.deprecated)) {
  fail('MCP must list Ghost as deprecated');
}

const agent = validateSnippet(
  contract,
  `export function Pay() { return <Button variant="ghost">Pay</Button>; }\n`,
);
if (agent.ok || !agent.findings.some((f) => f.code === CODES.INVALID_PROP_VALUE)) {
  fail('MCP validate_snippet must refuse variant="ghost"');
}

// One product command replaces the hand merge, restyle policy included:
//   decree prepare --from-specs specs --from-ds-contracts ds-contracts --restyle --out ...
const cliOut = join(outDir, 'cli-together.contract.json');
const cli = spawnSync(
  process.execPath,
  [
    join(repo, 'bin/decree.js'),
    'prepare',
    '--from-specs',
    join(root, 'specs'),
    '--from-ds-contracts',
    join(root, 'ds-contracts'),
    '--name',
    '@demo/harbor-ui',
    '--restyle',
    '--out',
    cliOut,
  ],
  { encoding: 'utf8' },
);
if (cli.status !== 0) fail(`combined CLI prepare failed: ${cli.stderr}`);
const cliContract = JSON.parse(readFileSync(cliOut, 'utf8'));
if (!contractsEqual(cliContract, contract)) {
  fail('combined CLI contract must equal the checked-in Harbor contract');
}

console.log('together: PASS');
console.log(
  `  Specs Button API + combos · DS native <button> · merged judge · clean ok · dirty ${dirty.findings.length} findings`,
);
console.log('\n  dirty app refusals:');
for (const finding of dirty.findings) {
  console.log(
    `    ${finding.code}  ${finding.file}:${finding.line}  ${finding.message}`,
  );
}

/**
 * @param {object} contract
 * @param {string} label
 */
function assertNoAuthoringLeak(contract, label) {
  const raw = JSON.stringify(contract);
  if (raw.includes('"anatomy"') || raw.includes('"bindings"')) {
    fail(`${label} judge slice leaked anatomy or bindings`);
  }
}

function fail(message) {
  console.error(`together: FAIL — ${message}`);
  process.exit(1);
}
