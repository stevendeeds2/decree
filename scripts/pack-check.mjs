#!/usr/bin/env node
/**
 * Fail if npm pack would include demos, tests, or other non-product assets.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'decree-pack-'));

const pack = spawnSync('npm', ['pack', '--json', '--pack-destination', dir], {
  cwd: root,
  encoding: 'utf8',
});

if (pack.status !== 0) {
  console.error(pack.stderr || pack.stdout);
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

/** @type {{ filename: string, files: { path: string }[] }[]} */
const meta = JSON.parse(pack.stdout);
const files = (meta[0]?.files ?? []).map((f) => f.path);
const banned = [/^demos\//, /^tests\//, /^scripts\//, /node_modules/];

const offenders = files.filter((p) => banned.some((re) => re.test(p)));
const required = ['bin/decree.js', 'bin/decree-mcp.js', 'src/verify/index.js'];
const missing = required.filter((p) => !files.includes(p));

console.log(`pack files: ${files.length}`);
console.log(`tarball: ${meta[0]?.filename ?? '(unknown)'}`);

if (offenders.length || missing.length) {
  if (offenders.length) {
    console.error('Banned paths in tarball:');
    for (const p of offenders.slice(0, 40)) console.error(`  ${p}`);
  }
  if (missing.length) {
    console.error('Missing required paths:');
    for (const p of missing) console.error(`  ${p}`);
  }
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });
console.log('pack:check PASS');
