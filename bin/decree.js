#!/usr/bin/env node
/**
 * Decree CLI stub — real verify lands in POC.
 * Usage: decree <command>
 */
const [cmd = 'help'] = process.argv.slice(2);

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(`decree — design system enforcement

Commands (stub):
  init      scaffold contract (TODO)
  build     emit contract from sources (TODO)
  verify    fail CI on invented UI (TODO)

Docs: docs/THESIS.md · docs/POC.md
`);
  process.exit(0);
}

console.error(`decree: command "${cmd}" not implemented yet (POC stub)`);
process.exit(2);
