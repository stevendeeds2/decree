/**
 * `decree setup`: everything an app team needs to start, in one command.
 * Finds the design system, copies its contract, writes the app's own scan
 * settings, records today's findings as a baseline, and adds an npm script.
 */

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePackageRoot } from '../init/resolve.js';
import { usePackageContract } from '../init/index.js';
import { verifyPath } from '../verify/index.js';

/**
 * Packages whose components are app plumbing (routing, data, drag-and-drop,
 * head tags), never stand-ins for design-system components.
 */
export const KNOWN_HOST_PACKAGES = Object.freeze([
  'react-router',
  'react-router-dom',
  '@tanstack/react-router',
  '@tanstack/react-query',
  'wouter',
  'preact-router',
  'preact-iso',
  'vue-router',
  '@angular/router',
  '@sveltejs/kit',
  '@remix-run/react',
  'react-redux',
  'react-helmet',
  'react-helmet-async',
  '@dnd-kit/',
  'react-dnd',
  'react-intl',
  'react-i18next',
  'framer-motion',
  'motion',
]);

/**
 * Where an app's own components usually live. `src` covers most apps; Next.js
 * style apps without `src` keep them in `app/` and `components/`.
 */
const SOURCE_DIRS = ['src'];
const ROOT_COMPONENT_DIRS = ['app', 'components', 'lib'];

/**
 * @param {string} appRoot
 */
function readAppPackage(appRoot) {
  const path = join(appRoot, 'package.json');
  if (!existsSync(path)) {
    throw new Error(`No package.json in ${appRoot}. Run decree setup from your app's folder.`);
  }
  return { path, pkg: JSON.parse(readFileSync(path, 'utf8')) };
}

/**
 * @param {Record<string, any>} pkg
 * @returns {string[]}
 */
function dependencyNames(pkg) {
  return Object.keys({
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  });
}

/**
 * Dependencies that ship a Decree contract.
 * @param {string} appRoot
 * @param {Record<string, any>} pkg
 * @returns {string[]}
 */
export function findDesignSystems(appRoot, pkg) {
  const found = [];
  for (const name of dependencyNames(pkg)) {
    let root;
    try {
      root = resolvePackageRoot(name, appRoot);
    } catch {
      continue;
    }
    let depPkg;
    try {
      depPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    const contractFile = typeof depPkg.decree === 'string' ? depPkg.decree : 'decree.contract.json';
    if (existsSync(join(root, contractFile))) found.push(name);
  }
  return found;
}

/**
 * @param {string} appRoot
 * @param {Record<string, any>} pkg
 */
export function detectAppScan(appRoot, pkg) {
  const deps = dependencyNames(pkg);
  const hostPackages = KNOWN_HOST_PACKAGES.filter((host) =>
    host.endsWith('/') ? deps.some((d) => d.startsWith(host)) : deps.includes(host),
  );
  const isDir = (d) => {
    const abs = join(appRoot, d);
    return existsSync(abs) && statSync(abs).isDirectory();
  };
  const dirs = SOURCE_DIRS.filter(isDir);
  const localComponentPrefixes = dirs.length > 0 ? dirs : ROOT_COMPONENT_DIRS.filter(isDir);
  return {
    profile: 'app',
    localComponentPrefixes: localComponentPrefixes.length > 0 ? localComponentPrefixes : ['.'],
    ...(hostPackages.length > 0 ? { hostPackages } : {}),
  };
}

/**
 * @param {string} appRoot
 * @param {{ designSystem?: string, baseline?: boolean, script?: boolean }} [opts]
 */
export function setupApp(appRoot, opts = {}) {
  const { path: pkgPath, pkg } = readAppPackage(appRoot);
  const contractPath = join(appRoot, 'decree.contract.json');
  const baselinePath = join(appRoot, 'decree.baseline.json');

  let designSystem = opts.designSystem;
  if (!designSystem) {
    const candidates = findDesignSystems(appRoot, pkg);
    if (candidates.length === 0) {
      throw new Error(
        "Couldn't find a design system in this app's dependencies that ships a Decree contract. " +
          'Install it first, or name it: decree setup <package-or-path>.',
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `Found more than one design system with a Decree contract: ${candidates.join(', ')}. ` +
          'Pick one: decree setup <package>.',
      );
    }
    designSystem = candidates[0];
  }

  const hadContract = existsSync(contractPath);
  const used = usePackageContract(designSystem, appRoot, { outPath: contractPath });

  // Fill in app settings only the first time; after that the app owns them.
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const appScan = detectAppScan(appRoot, pkg);
  if (!used.keptAppSettings) {
    contract.scan = { ...(contract.scan ?? {}), ...appScan };
    writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  }

  // Re-running setup must not quietly absorb new problems into an existing baseline.
  let findings = null;
  /** @type {Record<string, number>} */
  let byCode = {};
  const keptBaseline = existsSync(baselinePath);
  if (opts.baseline !== false && !keptBaseline) {
    const result = verifyPath(appRoot, { writeBaselinePath: baselinePath });
    if (!result.ok) {
      const reason = result.findings?.[0]?.message ?? 'unknown error';
      throw new Error(`Couldn't write the baseline: ${reason}`);
    }
    findings = result.findings.length;
    byCode = countByCode(result.findings);
  }

  let script = null;
  if (opts.script !== false) {
    pkg.scripts = pkg.scripts ?? {};
    const command =
      opts.baseline === false ? 'decree verify .' : 'decree verify . --baseline decree.baseline.json';
    if (!pkg.scripts.decree) {
      pkg.scripts.decree = command;
      script = command;
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    }
  }

  const deps = dependencyNames(pkg);
  return {
    designSystem,
    from: used.from,
    contractPath,
    updated: hadContract,
    scan: contract.scan,
    baselinePath: opts.baseline === false ? null : baselinePath,
    keptBaseline: opts.baseline !== false && keptBaseline,
    findings,
    byCode,
    script,
    decreeInstalled: deps.includes('@stevendeeds/decree'),
  };
}

/** @param {{ code: string }[]} findings */
function countByCode(findings) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const f of findings) out[f.code] = (out[f.code] ?? 0) + 1;
  return out;
}

const CODE_LABELS = {
  DECREE_UNKNOWN_COMPONENT: 'components that aren\u2019t in the design system',
  DECREE_UNKNOWN_PROP: 'props a component doesn\u2019t have',
  DECREE_INVALID_PROP_VALUE: 'prop values a component doesn\u2019t accept',
  DECREE_INVALID_PROP_COMBO: 'prop combinations that aren\u2019t allowed',
  DECREE_DEPRECATED_COMPONENT: 'retired components',
  DECREE_DEPRECATED_TOKEN: 'retired tokens',
  DECREE_NATIVE_ELEMENT: 'plain HTML where the design system has a component',
  DECREE_RESTYLE_STYLE: 'inline styles on design-system components',
  DECREE_RESTYLE_SX: 'sx= on design-system components',
  DECREE_RESTYLE_ARBITRARY_CLASS: 'one-off classes on design-system components',
  DECREE_HARDCODED_HEX: 'hardcoded colors',
  DECREE_HARDCODED_COLOR: 'hardcoded colors (rgb, hsl)',
  DECREE_ARBITRARY_VALUE: 'one-off sizes',
  DECREE_UNKNOWN_TOKEN: 'CSS variables that aren\u2019t design-system tokens',
};

/**
 * Plain-language summary for the CLI.
 * @param {ReturnType<typeof setupApp>} r
 */
export function describeSetup(r) {
  const lines = [];
  lines.push(`Decree is set up against ${r.designSystem}.`);
  lines.push('');
  lines.push(`  ${r.updated ? 'Updated' : 'Copied'} the design system's contract to decree.contract.json`);
  const where = r.scan?.localComponentPrefixes?.join(', ');
  if (where) lines.push(`  Your app's own components are read from: ${where}`);
  if (r.scan?.hostPackages?.length) {
    lines.push(`  Allowed as app plumbing: ${r.scan.hostPackages.join(', ')}`);
  }
  if (r.keptBaseline) {
    lines.push('  Kept your existing decree.baseline.json. To record today\'s problems again: decree verify . --write-baseline decree.baseline.json');
  }
  if (r.findings !== null) {
    lines.push(
      r.findings === 0
        ? '  No problems found today. decree.baseline.json is empty.'
        : `  Recorded ${r.findings} problem(s) that exist today in decree.baseline.json. Only new ones will fail.`,
    );
    for (const [code, count] of Object.entries(r.byCode ?? {}).sort((x, y) => y[1] - x[1])) {
      lines.push(`    ${String(count).padStart(4)}  ${CODE_LABELS[code] ?? code}`);
    }
    if (r.findings > 0) lines.push('  See each one: decree verify .');
  }
  if (r.script) lines.push(`  Added the npm script: "decree": "${r.script}"`);
  lines.push('');
  lines.push('Next:');
  if (!r.decreeInstalled) {
    lines.push('  npm install -D @stevendeeds/decree   (so the script works on every machine)');
  }
  lines.push('  npm run decree                       (run it before you merge)');
  lines.push(`  decree use ${r.designSystem} --check   (in CI: fails when the design system ships a new contract)`);
  lines.push('  decree mcp decree.contract.json      (give AI agents the same list)');
  lines.push('');
  lines.push('Commit decree.contract.json and decree.baseline.json.');
  return lines.join('\n');
}
