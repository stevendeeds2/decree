#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildContractFromPackage,
  resolvePackageRoot,
  writeContract,
} from '../src/init/index.js';
import { verifyPath } from '../src/verify/index.js';

const argv = process.argv.slice(2);
const [cmd = 'help', ...rest] = argv;

function printHelp() {
  console.log(`decree — design system enforcement

Commands:
  init <pkg>      Build decree.contract.json from a design-system package
  verify [path]   Fail if source invents UI outside the contract (default: .)
  mcp [contract]  Print MCP client config for the allowlist server
  help            Show this help

Init:
  decree init <path-or-package-name> [--out decree.contract.json] [--force]

Verify (brownfield ratchet):
  decree verify [path] [--baseline file] [--write-baseline file] [--max-new N]
  --baseline         fail only on findings not in the baseline
  --write-baseline   write current findings as baseline (exit 0)
  --max-new N        fail if new findings > N (with or without --baseline)

MCP server binary: decree-mcp [path/to/decree.contract.json]

Full story (sequenced):
  init  →  verify  →  mcp allowlist  →  docs-from-contract / measurement

Docs: docs/THESIS.md · docs/POC.md · docs/ADOPTION.md
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
 * @returns {{ positional: string[], out: string, force: boolean }}
 */
function parseInitArgs(args) {
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
    positional.push(a);
  }
  return { positional, out, force };
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printHelp();
  process.exit(0);
}

if (cmd === 'init') {
  const { positional, out, force } = parseInitArgs(rest);
  const spec = positional[0];
  if (!spec) {
    console.error('decree init: missing <path-or-package-name>');
    printHelp();
    process.exit(2);
  }
  try {
    const packageRoot = resolvePackageRoot(spec, process.cwd());
    const contract = buildContractFromPackage(packageRoot);
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
    // allow --write-baseline=path form only through parser; bare flag without value
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
