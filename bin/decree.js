#!/usr/bin/env node
import { resolve } from 'node:path';
import { verifyPath } from '../src/verify/index.js';

const [cmd = 'help', target = '.'] = process.argv.slice(2);

function printHelp() {
  console.log(`decree — design system enforcement

Commands:
  verify [path]   Fail if source invents UI outside the contract (default: .)
  help            Show this help

Full story (sequenced):
  verify  →  mcp allowlist  →  dogfood / more frameworks  →  docs-from-contract

Docs: docs/THESIS.md · docs/POC.md
`);
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printHelp();
  process.exit(0);
}

if (cmd === 'verify') {
  const result = verifyPath(resolve(target));
  for (const f of result.findings) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.error(`${f.code}  ${loc}  ${f.message}`);
  }
  if (result.ok) {
    console.log(
      `decree verify: ok (${result.filesScanned ?? 0} files, contract ${result.contractPath})`,
    );
  } else {
    console.error(
      `decree verify: failed with ${result.findings.length} finding(s)`,
    );
  }
  process.exit(result.exitCode);
}

console.error(`decree: unknown command "${cmd}"`);
printHelp();
process.exit(2);
