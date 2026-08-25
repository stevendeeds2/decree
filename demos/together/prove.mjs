#!/usr/bin/env node
/**
 * Together prototype: Nathan Specs 2 + TJ DS Contracts → Decree judge.
 * Run from repo root: node demos/together/prove.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  buildContractFromDsContracts,
  buildContractFromSpecs,
  canonicalizeContract,
} from '../../src/init/index.js';
import { validateContract } from '../../src/contract/index.js';
import { verifyPath } from '../../src/verify/index.js';
import { listPrimitives, validateSnippet } from '../../src/mcp/allowlist.js';
import { CODES } from '../../src/verify/codes.js';

const root = join(dirname(fileURLToPath(import.meta.url)));
const repo = join(root, '../..');
const outDir = join(root, 'out');
mkdirSync(outDir, { recursive: true });

const fromSpecs = buildContractFromSpecs(join(root, 'nathan'), {
  name: '@demo/harbor-ui',
});
const fromDs = buildContractFromDsContracts(join(root, 'tj'), {
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

const contract = mergeJudgeSlice(fromSpecs, fromDs);
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

const cliSpecs = spawnSync(
  process.execPath,
  [
    join(repo, 'bin/decree.js'),
    'prepare',
    '--from-specs',
    join(root, 'nathan'),
    '--out',
    join(outDir, 'cli-from-specs.contract.json'),
  ],
  { encoding: 'utf8' },
);
if (cliSpecs.status !== 0) fail(`CLI --from-specs failed: ${cliSpecs.stderr}`);

const cliDs = spawnSync(
  process.execPath,
  [
    join(repo, 'bin/decree.js'),
    'prepare',
    '--from-ds-contracts',
    join(root, 'tj'),
    '--out',
    join(outDir, 'cli-from-ds-contracts.contract.json'),
  ],
  { encoding: 'utf8' },
);
if (cliDs.status !== 0) fail(`CLI --from-ds-contracts failed: ${cliDs.stderr}`);

console.log('together: PASS');
console.log(
  `  Specs Button API + combos · DS native <button> · merged judge · clean ok · dirty ${dirty.findings.length} findings`,
);
console.log(`  codes: ${[...codes].sort().join(', ')}`);

/**
 * Decree policy on top of both authoring sources.
 * @param {import('../../src/contract/index.js').DecreeContract} fromSpecs
 * @param {import('../../src/contract/index.js').DecreeContract} fromDs
 */
function mergeJudgeSlice(fromSpecs, fromDs) {
  return {
    version: 1,
    name: '@demo/harbor-ui',
    package: '@demo/harbor-ui',
    components: [...new Set([...fromSpecs.components, ...fromDs.components])].sort(),
    tokens: mergeTokens(fromSpecs.tokens, fromDs.tokens),
    nativeElementMap: {
      ...fromSpecs.nativeElementMap,
      ...fromDs.nativeElementMap,
    },
    componentApis: {
      ...fromDs.componentApis,
      ...fromSpecs.componentApis,
    },
    deprecations: {
      components: {
        ...fromDs.deprecations?.components,
        ...fromSpecs.deprecations?.components,
      },
    },
    restyle: true,
  };
}

function mergeTokens(a, b) {
  const map = new Map();
  for (const token of [...a, ...b]) map.set(token.name, token);
  return [...map.values()].sort((x, y) => x.name.localeCompare(y.name));
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
