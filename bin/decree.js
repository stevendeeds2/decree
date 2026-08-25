#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildContractFromPackage,
  prepareFromExternal,
  preparePackage,
  resolvePackageRoot,
  usePackageContract,
  writeContract,
  writeSourcesScaffold,
} from '../src/init/index.js';
import { verifyPath } from '../src/verify/index.js';

const argv = process.argv.slice(2);
const [cmd = 'help', ...rest] = argv;

function printHelp() {
  console.log(`decree — design system enforcement

Commands:
  sources [path]  Scaffold decree.sources.json (all options, empty values)
  init <pkg>      Build decree.contract.json from a design-system package
  prepare [path]  Regenerate contract from decree.sources.json (DS publish)
  use <pkg>       Copy a published package contract into the current app
  verify [path]   Fail if source invents UI outside the contract (default: .)
  mcp [contract]  Print MCP client config for the allowlist server
  help            Show this help

Sources / prepare:
  decree sources [package-root] [--out decree.sources.json] [--force]
  decree init <path-or-package-name> [--out decree.contract.json] [--force] [--sources file]
  decree prepare [package-root] [--out decree.contract.json] [--check] [--sources file]
  decree prepare --from-specs <dir> [--out decree.contract.json] [--check]
  decree prepare --from-ds-contracts <dir> [--out decree.contract.json] [--check]
  decree use <path-or-package-name> [--out decree.contract.json] [--force]

Verify (brownfield ratchet):
  decree verify [path] [--baseline file] [--write-baseline file] [--max-new N]

MCP server binary: decree-mcp [path/to/decree.contract.json]

Recommended DS flow:
  decree sources  →  fill include/tokens  →  decree prepare  →  publish contract
  app: decree use @acme/ds  →  decree verify .

Docs: docs/SOURCES.md · docs/INIT.md · docs/ADAPTERS.md · docs/ADOPTION.md · docs/GETTING_STARTED.md
`);
}

/**
 * @param {string[]} args
 * @returns {{
 *   positional: string[],
 *   baselinePath?: string,
 *   writeBaselinePath?: string,
 *   maxNew?: number,
 * }}
 */
function parseVerifyArgs(args) {
  /** @type {string[]} */
  const positional = [];
  /** @type {string | undefined} */
  let baselinePath;
  /** @type {string | undefined} */
  let writeBaselinePath;
  /** @type {number | undefined} */
  let maxNew;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--baseline') {
      baselinePath = args[++i];
      continue;
    }
    if (a.startsWith('--baseline=')) {
      baselinePath = a.slice('--baseline='.length);
      continue;
    }
    if (a === '--write-baseline') {
      writeBaselinePath = args[++i];
      continue;
    }
    if (a.startsWith('--write-baseline=')) {
      writeBaselinePath = a.slice('--write-baseline='.length);
      continue;
    }
    if (a === '--max-new') {
      const raw = args[++i];
      maxNew = Number(raw);
      continue;
    }
    if (a.startsWith('--max-new=')) {
      maxNew = Number(a.slice('--max-new='.length));
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`decree verify: unknown flag ${a}`);
      process.exit(2);
    }
    positional.push(a);
  }
  return { positional, baselinePath, writeBaselinePath, maxNew };
}

/**
 * @param {string[]} args
 * @returns {{ positional: string[], out: string, force: boolean, sources?: string }}
 */
function parseInitArgs(args) {
  let out = 'decree.contract.json';
  let force = false;
  /** @type {string | undefined} */
  let sources;
  /** @type {string[]} */
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--force') {
      force = true;
      continue;
    }
    if (a === '--out') {
      out = args[++i] ?? out;
      continue;
    }
    if (a.startsWith('--out=')) {
      out = a.slice('--out='.length);
      continue;
    }
    if (a === '--sources') {
      sources = args[++i];
      continue;
    }
    if (a.startsWith('--sources=')) {
      sources = a.slice('--sources='.length);
      continue;
    }
    positional.push(a);
  }
  return { positional, out, force, sources };
}

/**
 * @param {string[]} args
 */
function parsePrepareArgs(args) {
  let out;
  let check = false;
  /** @type {string | undefined} */
  let sources;
  /** @type {string | undefined} */
  let fromSpecs;
  /** @type {string | undefined} */
  let fromDsContracts;
  /** @type {string | undefined} */
  let name;
  /** @type {string[]} */
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--check') {
      check = true;
      continue;
    }
    if (a === '--out') {
      out = args[++i];
      continue;
    }
    if (a.startsWith('--out=')) {
      out = a.slice('--out='.length);
      continue;
    }
    if (a === '--sources') {
      sources = args[++i];
      continue;
    }
    if (a.startsWith('--sources=')) {
      sources = a.slice('--sources='.length);
      continue;
    }
    if (a === '--from-specs') {
      fromSpecs = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : '';
      continue;
    }
    if (a.startsWith('--from-specs=')) {
      fromSpecs = a.slice('--from-specs='.length);
      continue;
    }
    if (a === '--from-ds-contracts') {
      fromDsContracts =
        args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : '';
      continue;
    }
    if (a.startsWith('--from-ds-contracts=')) {
      fromDsContracts = a.slice('--from-ds-contracts='.length);
      continue;
    }
    if (a === '--name') {
      name = args[++i];
      continue;
    }
    if (a.startsWith('--name=')) {
      name = a.slice('--name='.length);
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`decree prepare: unknown flag ${a}`);
      process.exit(2);
    }
    positional.push(a);
  }
  return { positional, out, check, sources, fromSpecs, fromDsContracts, name };
}

/**
 * @param {string[]} args
 */
function parseUseArgs(args) {
  let out = 'decree.contract.json';
  let force = false;
  /** @type {string[]} */
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--force') {
      force = true;
      continue;
    }
    if (a === '--out') {
      out = args[++i] ?? out;
      continue;
    }
    if (a.startsWith('--out=')) {
      out = a.slice('--out='.length);
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`decree use: unknown flag ${a}`);
      process.exit(2);
    }
    positional.push(a);
  }
  return { positional, out, force };
}

/**
 * @param {string[]} args
 * @returns {{ positional: string[], out?: string, force: boolean }}
 */
function parseSourcesArgs(args) {
  /** @type {string | undefined} */
  let out;
  let force = false;
  /** @type {string[]} */
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--force') {
      force = true;
      continue;
    }
    if (a === '--out') {
      out = args[++i];
      continue;
    }
    if (a.startsWith('--out=')) {
      out = a.slice('--out='.length);
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`decree sources: unknown flag ${a}`);
      process.exit(2);
    }
    positional.push(a);
  }
  return { positional, out, force };
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printHelp();
  process.exit(0);
}

if (cmd === 'sources') {
  const { positional, out, force } = parseSourcesArgs(rest);
  const rootSpec = positional[0] ?? '.';
  try {
    const packageRoot = resolve(rootSpec);
    const result = writeSourcesScaffold(packageRoot, {
      force,
      outPath: out ? resolve(out) : undefined,
    });
    console.log(`decree sources: wrote ${result.path}`);
    console.error(
      'Fill components.include and tokens (cssAllowlist or files), then: decree prepare\n' +
        'tokens.mode: dtcg-only | css-allowlist | legacy-scan — see docs/SOURCES.md',
    );
    process.exit(0);
  } catch (err) {
    console.error(
      `decree sources: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }
}

if (cmd === 'init') {
  const { positional, out, force, sources } = parseInitArgs(rest);
  const spec = positional[0];
  if (!spec) {
    console.error('decree init: missing <path-or-package-name>');
    printHelp();
    process.exit(2);
  }
  try {
    const packageRoot = resolvePackageRoot(spec, process.cwd());
    const { contract, legacy, sourcesPath } = buildContractFromPackage(
      packageRoot,
      { sourcesPath: sources },
    );
    if (legacy) {
      console.error(
        'decree: no decree.sources.json — using legacy full scan; expect noise. See docs/SOURCES.md',
      );
    } else if (sourcesPath) {
      console.error(`decree: using sources ${sourcesPath}`);
    }
    const result = writeContract(contract, resolve(out), { force });
    console.log(
      `decree init: wrote ${result.path} (${contract.components.length} components, ${contract.tokens.length} tokens) from ${packageRoot}`,
    );
    process.exit(0);
  } catch (err) {
    console.error(`decree init: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

if (cmd === 'prepare') {
  const parsed = parsePrepareArgs(rest);
  const { positional, out, check, sources, fromSpecs, fromDsContracts, name } =
    parsed;
  if (fromSpecs !== undefined && fromDsContracts !== undefined) {
    console.error(
      'decree prepare: use only one of --from-specs or --from-ds-contracts',
    );
    process.exit(2);
  }
  const rootSpec =
    (fromSpecs !== undefined && fromSpecs) ||
    (fromDsContracts !== undefined && fromDsContracts) ||
    positional[0] ||
    '.';
  try {
    const inputRoot = resolve(rootSpec);
    if (fromSpecs !== undefined || fromDsContracts !== undefined) {
      const kind = fromSpecs !== undefined ? 'specs' : 'ds-contracts';
      const result = prepareFromExternal(kind, inputRoot, {
        outPath: out ? resolve(out) : undefined,
        check,
        name,
      });
      if (check) {
        console.log(result.message);
        process.exit(result.ok ? 0 : 1);
      }
      const apiCount = result.contract.componentApis
        ? Object.keys(result.contract.componentApis).length
        : 0;
      console.log(
        `${result.message} (${result.contract.components.length} components, ${apiCount} component APIs, ${result.contract.tokens.length} tokens)`,
      );
      process.exit(0);
    }
    const result = preparePackage(inputRoot, {
      outPath: out ? resolve(out) : undefined,
      check,
      force: true,
      sourcesPath: sources,
    });
    if (result.legacy) {
      console.error(
        'decree: no decree.sources.json — using legacy full scan; expect noise. See docs/SOURCES.md',
      );
    } else if (result.sourcesPath) {
      console.error(`decree: using sources ${result.sourcesPath}`);
    }
    if (check) {
      console.log(result.message);
      process.exit(result.ok ? 0 : 1);
    }
    console.log(
      `${result.message} (${result.contract.components.length} components, ${result.contract.tokens.length} tokens)`,
    );
    process.exit(0);
  } catch (err) {
    console.error(
      `decree prepare: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }
}

if (cmd === 'use') {
  const { positional, out, force } = parseUseArgs(rest);
  const spec = positional[0];
  if (!spec) {
    console.error('decree use: missing <path-or-package-name>');
    printHelp();
    process.exit(2);
  }
  try {
    const result = usePackageContract(spec, process.cwd(), {
      outPath: resolve(out),
      force,
    });
    console.log(
      `decree use: copied ${result.from} → ${result.path}`,
    );
    process.exit(0);
  } catch (err) {
    console.error(`decree use: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

if (cmd === 'verify') {
  const parsed = parseVerifyArgs(rest);
  if (parsed.baselinePath === undefined && rest.includes('--baseline')) {
    console.error('decree verify: --baseline requires a path');
    process.exit(2);
  }
  if (
    parsed.writeBaselinePath === undefined &&
    rest.some((a) => a === '--write-baseline' || a.startsWith('--write-baseline='))
  ) {
    if (rest.includes('--write-baseline') && !parsed.writeBaselinePath) {
      console.error('decree verify: --write-baseline requires a path');
      process.exit(2);
    }
  }
  if (
    parsed.maxNew !== undefined &&
    (Number.isNaN(parsed.maxNew) || !Number.isInteger(parsed.maxNew))
  ) {
    console.error('decree verify: --max-new requires a non-negative integer');
    process.exit(2);
  }
  const target = parsed.positional[0] ?? '.';
  const result = verifyPath(resolve(target), {
    baselinePath: parsed.baselinePath
      ? resolve(parsed.baselinePath)
      : undefined,
    writeBaselinePath: parsed.writeBaselinePath
      ? resolve(parsed.writeBaselinePath)
      : undefined,
    maxNew: parsed.maxNew,
  });

  const toPrint =
    parsed.baselinePath || parsed.maxNew !== undefined
      ? result.newFindings ?? result.findings
      : result.findings;
  for (const f of toPrint) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.error(`${f.code}  ${loc}  ${f.message}`);
  }

  const newCount = result.newCount ?? result.findings.length;
  const baselinedCount = result.baselinedCount ?? 0;
  const total = result.findings.length;
  console.error(
    `decree verify: ${newCount} new, ${baselinedCount} baselined, ${total} total`,
  );

  if (result.wroteBaseline) {
    console.log(`decree verify: wrote baseline ${result.wroteBaseline}`);
  } else if (result.ok) {
    console.log(
      `decree verify: ok (${result.filesScanned ?? 0} files, contract ${result.contractPath})`,
    );
  } else if (result.exitCode === 2) {
    console.error(
      `decree verify: error — ${result.findings[0]?.message ?? 'invalid config'}`,
    );
  } else {
    console.error(
      `decree verify: failed with ${newCount} new finding(s)`,
    );
  }
  process.exit(result.exitCode);
}

if (cmd === 'mcp') {
  const target = rest[0] ?? '.';
  const contract = resolve(target === '.' ? 'decree.contract.json' : target);
  const mcpBin = resolve(
    fileURLToPath(new URL('./decree-mcp.js', import.meta.url)),
  );
  const config = {
    mcpServers: {
      decree: {
        command: 'node',
        args: [mcpBin, contract],
      },
    },
  };
  console.log(JSON.stringify(config, null, 2));
  console.error(
    `\n# Add the above to your MCP client config.\n# Contract: ${contract}\n# Tools: list_primitives, list_tokens, is_allowed_primitive, validate_snippet`,
  );
  process.exit(0);
}

console.error(`decree: unknown command "${cmd}"`);
printHelp();
process.exit(2);
