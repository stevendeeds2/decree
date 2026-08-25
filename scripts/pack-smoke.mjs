#!/usr/bin/env node
/**
 * Prove a stranger can install the packed tarball and run decree.
 * GitHub Packages is still blocked on scope/owner; this is the viable path.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'decree-pack-smoke-'));

function run(cmd, args, cwd = dir) {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    rmSync(dir, { recursive: true, force: true });
    process.exit(result.status ?? 1);
  }
  return result;
}

const pack = spawnSync(
  'npm',
  ['pack', '--json', '--pack-destination', dir],
  { cwd: root, encoding: 'utf8' },
);
if (pack.status !== 0) {
  console.error(pack.stderr || pack.stdout);
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

const meta = JSON.parse(pack.stdout);
const tarball = join(dir, meta[0].filename);
const app = join(dir, 'app');
mkdirSync(app);
writeFileSync(
  join(app, 'package.json'),
  JSON.stringify({ name: 'decree-smoke', private: true, type: 'module' }),
);
writeFileSync(
  join(app, 'decree.contract.json'),
  `${JSON.stringify(
    {
      version: 1,
      components: ['Button'],
      tokens: [],
      nativeElementMap: {},
      restyle: true,
      componentApis: {
        Button: { props: { variant: { enum: ['primary'] } } },
      },
    },
    null,
    2,
  )}\n`,
);
writeFileSync(
  join(app, 'App.tsx'),
  `export function App() { return <Button variant="primary">Go</Button>; }\n`,
);

run('npm', ['install', tarball], app);
const help = run('npx', ['decree', '--help'], app);
if (!help.stdout.includes('decree prepare --from-specs')) {
  console.error('pack-smoke: help missing adapter flags');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}
const verify = run('npx', ['decree', 'verify', '.'], app);
if (!verify.stdout.includes('decree verify: ok')) {
  console.error(verify.stdout);
  console.error(verify.stderr);
  console.error('pack-smoke: clean verify did not pass');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

writeFileSync(
  join(app, 'Dirty.tsx'),
  `export function Dirty() { return <Button style={{ color: 'red' }} variant="ghost">No</Button>; }\n`,
);
const dirty = spawnSync('npx', ['decree', 'verify', '.'], {
  cwd: app,
  encoding: 'utf8',
});
if (dirty.status === 0) {
  console.error('pack-smoke: dirty verify should fail');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}
if (
  !dirty.stderr.includes('DECREE_RESTYLE_STYLE') ||
  !dirty.stderr.includes('DECREE_INVALID_PROP_VALUE')
) {
  console.error(dirty.stderr);
  console.error('pack-smoke: dirty verify missing restyle/API codes');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });
console.log('pack:smoke PASS');
