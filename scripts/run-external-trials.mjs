#!/usr/bin/env node
/**
 * Run Decree against vendored public third-party apps under examples/trials/.
 * Writes JSON + markdown summaries to examples/trials/_reports/
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPath } from '../src/verify/index.js';
import { buildContractFromPackage, writeContract } from '../src/init/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trialsRoot = join(root, 'examples/trials');
const reportsDir = join(trialsRoot, '_reports');
const decreeBin = join(root, 'bin/decree.js');

mkdirSync(reportsDir, { recursive: true });

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: process.env });
  return r;
}

function summarize(findings) {
  /** @type {Record<string, number>} */
  const byCode = {};
  for (const f of findings) {
    byCode[f.code] = (byCode[f.code] || 0) + 1;
  }
  const topFiles = {};
  for (const f of findings) {
    topFiles[f.file] = (topFiles[f.file] || 0) + 1;
  }
  const topFilesSorted = Object.entries(topFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  return { byCode, topFiles: topFilesSorted, total: findings.length };
}

function npmInstall(dir) {
  if (!existsSync(join(dir, 'package.json'))) return { ok: false, error: 'no package.json' };
  console.log(`npm install → ${dir}`);
  const r = run('npm', ['install', '--no-fund', '--no-audit', '--legacy-peer-deps'], dir);
  return { ok: r.status === 0, status: r.status, stderr: r.stderr?.slice(-500) };
}

/** @type {Array<{
 *  id: string,
 *  title: string,
 *  source: string,
 *  appDir: string,
 *  initTarget: () => string,
 *  prepare?: () => void,
 * }>} */
const trials = [
  {
    id: 'mui-nextjs-ts',
    title: 'Official MUI Next.js TypeScript example',
    source: 'https://github.com/mui/material-ui/tree/master/examples/material-ui-nextjs-ts',
    appDir: join(trialsRoot, 'mui-nextjs-ts'),
    initTarget: () =>
      join(trialsRoot, 'mui-nextjs-ts/node_modules/@mui/material'),
  },
  {
    id: 'radix-themes-playground',
    title: 'Radix Themes official playground (apps/playground)',
    source: 'https://github.com/radix-ui/themes/tree/main/apps/playground',
    appDir: join(trialsRoot, 'radix-themes-playground'),
    prepare: () => {
      // workspace:* won't resolve outside the monorepo — pin a published version
      const pkgPath = join(trialsRoot, 'radix-themes-playground/package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      pkg.dependencies['@radix-ui/themes'] = '^3.2.1';
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    },
    initTarget: () =>
      join(trialsRoot, 'radix-themes-playground/node_modules/@radix-ui/themes'),
  },
  {
    id: 'shadcn-dashboard-starter',
    title: 'next-shadcn-dashboard-starter (Kiranism)',
    source: 'https://github.com/Kiranism/next-shadcn-dashboard-starter',
    appDir: join(trialsRoot, 'shadcn-dashboard-starter'),
    prepare: () => {
      // Treat local shadcn ui/ folder as the design-system package for init
      const uiPkg = join(
        trialsRoot,
        'shadcn-dashboard-starter/src/components/ui/package.json',
      );
      writeFileSync(
        uiPkg,
        `${JSON.stringify(
          {
            name: '@trial/shadcn-ui-local',
            version: '0.0.0',
            private: true,
            type: 'module',
          },
          null,
          2,
        )}\n`,
      );
    },
    initTarget: () =>
      join(trialsRoot, 'shadcn-dashboard-starter/src/components/ui'),
  },
];

const results = [];

for (const trial of trials) {
  console.log(`\n======== TRIAL ${trial.id} ========`);
  if (!existsSync(trial.appDir)) {
    results.push({ id: trial.id, error: 'app missing — run fetch first' });
    continue;
  }
  trial.prepare?.();

  // shadcn: skip full app npm install (heavy); only need ui sources for init+verify
  let install = { ok: true, skipped: false };
  if (trial.id !== 'shadcn-dashboard-starter') {
    install = npmInstall(trial.appDir);
  } else {
    install = { ok: true, skipped: true };
  }

  const initPath = trial.initTarget();
  let contractMeta = null;
  let verifySummary = null;
  let verifyOk = null;
  let findings = [];

  try {
    if (!existsSync(join(initPath, 'package.json')) && trial.id !== 'shadcn-dashboard-starter') {
      throw new Error(`init target missing: ${initPath}`);
    }
    if (trial.id === 'shadcn-dashboard-starter' && !existsSync(initPath)) {
      throw new Error(`shadcn ui folder missing: ${initPath}`);
    }

    const contract = buildContractFromPackage(initPath);
    // shadcn: don't treat the vendored DS + theme CSS dumps as consumer UI
    if (trial.id === 'shadcn-dashboard-starter') {
      contract.scan = {
        excludePrefixes: ['src/components/ui', 'src/styles/themes'],
      };
    }
    const contractOut = join(trial.appDir, 'decree.contract.json');
    writeContract(contract, contractOut, { force: true });
    contractMeta = {
      components: contract.components.length,
      tokens: contract.tokens.length,
      sampleComponents: contract.components.slice(0, 20),
      path: contractOut,
      scan: contract.scan || null,
    };

    const verified = verifyPath(trial.appDir);
    findings = verified.findings;
    verifyOk = verified.ok;
    verifySummary = {
      ...summarize(findings),
      filesScanned: verified.filesScanned,
      exitCode: verified.exitCode,
    };

    // Persist raw findings (capped)
    writeFileSync(
      join(reportsDir, `${trial.id}.findings.json`),
      `${JSON.stringify(findings.slice(0, 500), null, 2)}\n`,
    );
  } catch (err) {
    results.push({
      id: trial.id,
      title: trial.title,
      source: trial.source,
      install,
      error: err instanceof Error ? err.message : String(err),
    });
    continue;
  }

  results.push({
    id: trial.id,
    title: trial.title,
    source: trial.source,
    install,
    contract: contractMeta,
    verifyOk,
    verify: verifySummary,
  });
}

writeFileSync(join(reportsDir, 'summary.json'), `${JSON.stringify(results, null, 2)}\n`);

const md = [];
md.push('# External trials report');
md.push('');
md.push(`Generated: ${new Date().toISOString()}`);
md.push('');
md.push('Public third-party apps only. No personal production apps.');
md.push('');

for (const r of results) {
  md.push(`## ${r.id}`);
  md.push('');
  md.push(`- **Source:** ${r.source}`);
  md.push(`- **Title:** ${r.title}`);
  if (r.error) {
    md.push(`- **Error:** ${r.error}`);
    md.push('');
    continue;
  }
  md.push(
    `- **Install:** ${r.install?.skipped ? 'skipped' : r.install?.ok ? 'ok' : 'failed'}`,
  );
  md.push(
    `- **Contract:** ${r.contract.components} components, ${r.contract.tokens} tokens`,
  );
  md.push(
    `- **Verify:** ${r.verifyOk ? 'PASS' : 'FAIL'} — ${r.verify.total} finding(s) across ${r.verify.filesScanned} files`,
  );
  md.push('- **Codes:**');
  for (const [code, n] of Object.entries(r.verify.byCode).sort(
    (a, b) => b[1] - a[1],
  )) {
    md.push(`  - \`${code}\`: ${n}`);
  }
  md.push('- **Top files:**');
  for (const [file, n] of r.verify.topFiles) {
    md.push(`  - \`${file}\`: ${n}`);
  }
  md.push(`- Sample components from init: ${r.contract.sampleComponents.join(', ')}`);
  md.push('');
}

md.push('## Interpretation notes');
md.push('');
md.push(
  '- Failures are expected on first pass: consumer apps use local wrappers, icons, and layout shells outside the DS package allowlist.',
);
md.push(
  '- `DECREE_UNKNOWN_COMPONENT` volume is the main signal for contract curation (allow local shells vs enforce primitives only).',
);
md.push(
  '- Color findings (`HARDCODED_HEX` / `HARDCODED_COLOR`) show token discipline gaps.',
);
md.push(
  '- Native element findings show places still using raw HTML controls.',
);
md.push('');

writeFileSync(join(reportsDir, 'TRIALS.md'), `${md.join('\n')}\n`);
// Also publish to docs/
cpSync(join(reportsDir, 'TRIALS.md'), join(root, 'docs/TRIALS.md'));

console.log('\nWrote', join(reportsDir, 'summary.json'));
console.log('Wrote', join(reportsDir, 'TRIALS.md'));
console.log('Wrote', join(root, 'docs/TRIALS.md'));
