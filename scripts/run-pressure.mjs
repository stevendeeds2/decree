#!/usr/bin/env node
/**
 * Pressure-test Decree before inviting outside testers.
 * Runs unit tests, fixture verifies, adversarial fixture, and trial summary.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPath } from '../src/verify/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = join(root, 'examples/trials/_reports');
mkdirSync(reportsDir, { recursive: true });

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  return r;
}

const fixtures = [
  { id: 'shadcn-clean', path: 'fixtures/shadcn-clean', expectOk: true },
  { id: 'shadcn-dirty', path: 'fixtures/shadcn-dirty', expectOk: false },
  { id: 'mui-clean', path: 'fixtures/mui-clean', expectOk: true },
  { id: 'mui-dirty', path: 'fixtures/mui-dirty', expectOk: false },
  {
    id: 'radix-themes-clean',
    path: 'examples/radix-themes-clean',
    expectOk: true,
  },
  {
    id: 'radix-themes-dirty',
    path: 'examples/radix-themes-dirty',
    expectOk: false,
  },
  {
    id: 'pressure-adversarial',
    path: 'fixtures/pressure-adversarial',
    expectOk: false,
  },
];

/** @type {Record<string, unknown>} */
const report = {
  generated: new Date().toISOString(),
  unitTests: null,
  fixtures: [],
  trials: null,
  gate: { ok: true, failures: [] },
};

console.log('== unit tests ==');
const testRun = run('npm', ['test']);
report.unitTests = {
  status: testRun.status,
  ok: testRun.status === 0,
};
if (testRun.status !== 0) {
  report.gate.ok = false;
  report.gate.failures.push('npm test failed');
  console.error(testRun.stdout || testRun.stderr);
}

console.log('== fixture verifies ==');
for (const f of fixtures) {
  const full = join(root, f.path);
  if (!existsSync(full)) {
    report.fixtures.push({ id: f.id, error: 'missing' });
    report.gate.ok = false;
    report.gate.failures.push(`missing fixture ${f.id}`);
    continue;
  }
  const result = verifyPath(full);
  const pass = result.ok === f.expectOk;
  const entry = {
    id: f.id,
    expectOk: f.expectOk,
    ok: result.ok,
    findings: result.findings.length,
    codes: Object.fromEntries(
      result.findings.reduce((m, x) => {
        m.set(x.code, (m.get(x.code) || 0) + 1);
        return m;
      }, new Map()),
    ),
    pass,
  };
  report.fixtures.push(entry);
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${f.id} (ok=${result.ok}, findings=${result.findings.length})`,
  );
  if (!pass) {
    report.gate.ok = false;
    report.gate.failures.push(`fixture expectation failed: ${f.id}`);
  }
}

console.log('== external trials ==');
const trialsRun = run('npm', ['run', 'trials']);
report.trials = { status: trialsRun.status, ok: trialsRun.status === 0 };
if (trialsRun.status !== 0) {
  report.gate.ok = false;
  report.gate.failures.push('npm run trials failed');
}

const summaryPath = join(reportsDir, 'summary.json');
if (existsSync(summaryPath)) {
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  report.trialSummary = summary.map((t) => ({
    id: t.id,
    verifyOk: t.verifyOk,
    total: t.verify?.total ?? null,
    byCode: t.verify?.byCode ?? null,
    error: t.error ?? null,
  }));
  const mui = summary.find((t) => t.id === 'mui-nextjs-ts');
  if (!mui || mui.verify?.total !== 1) {
    report.gate.ok = false;
    report.gate.failures.push(
      `mui-nextjs-ts expected 1 finding, got ${mui?.verify?.total ?? 'missing'}`,
    );
  } else if (!mui.verify?.byCode?.DECREE_HARDCODED_HEX) {
    report.gate.ok = false;
    report.gate.failures.push('mui-nextjs-ts expected HARDCODED_HEX residual');
  }
}

// Brownfield ratchet: shadcn trial must be green under checked-in baseline
const shadcnApp = join(root, 'examples/trials/shadcn-dashboard-starter');
const shadcnBaseline = join(reportsDir, 'shadcn.baseline.json');
if (existsSync(shadcnApp) && existsSync(shadcnBaseline)) {
  const ratchet = verifyPath(shadcnApp, { baselinePath: shadcnBaseline });
  report.shadcnBaseline = {
    ok: ratchet.ok,
    newCount: ratchet.newCount,
    baselinedCount: ratchet.baselinedCount,
  };
  console.log(
    `== shadcn baseline ratchet == new=${ratchet.newCount} baselined=${ratchet.baselinedCount} ok=${ratchet.ok}`,
  );
  if (!ratchet.ok || ratchet.newCount !== 0) {
    report.gate.ok = false;
    report.gate.failures.push(
      `shadcn baseline ratchet expected 0 new, got ${ratchet.newCount}`,
    );
  }
} else {
  report.gate.ok = false;
  report.gate.failures.push('shadcn trial or baseline missing');
}

const outJson = join(reportsDir, 'pressure.json');
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);

const md = [];
md.push('# Decree pressure report');
md.push('');
md.push(`Generated: ${report.generated}`);
md.push('');
md.push(`## Gate: ${report.gate.ok ? 'PASS' : 'FAIL'}`);
md.push('');
if (report.gate.failures.length) {
  for (const f of report.gate.failures) md.push(`- ${f}`);
  md.push('');
}
md.push('## Unit tests');
md.push('');
md.push(`- ok: ${report.unitTests.ok}`);
md.push('');
md.push('## Fixtures');
md.push('');
md.push('| Fixture | Expect | Actual ok | Findings | Pass |');
md.push('|---------|--------|-----------|----------|------|');
for (const f of report.fixtures) {
  md.push(
    `| ${f.id} | ${f.expectOk} | ${f.ok} | ${f.findings ?? f.error} | ${f.pass} |`,
  );
}
md.push('');
md.push('## Trials');
md.push('');
if (report.trialSummary) {
  md.push('| Trial | Findings | Codes |');
  md.push('|-------|----------|-------|');
  for (const t of report.trialSummary) {
    md.push(
      `| ${t.id} | ${t.total ?? t.error} | ${JSON.stringify(t.byCode) || '—'} |`,
    );
  }
}
md.push('');
md.push('## Outside-tester readiness');
md.push('');
if (report.gate.ok) {
  md.push(
    'Internal pressure gate passed. Still POC — invite only technical design-system folks, not general users.',
  );
} else {
  md.push('Internal pressure gate **failed** — do not invite outside testers yet.');
}
md.push('');

const outMd = join(root, 'docs/PRESSURE.md');
writeFileSync(outMd, md.join('\n'));
console.log('\nWrote', outJson);
console.log('Wrote', outMd);
console.log(report.gate.ok ? '\nPRESSURE GATE: PASS' : '\nPRESSURE GATE: FAIL');
process.exit(report.gate.ok ? 0 : 1);
