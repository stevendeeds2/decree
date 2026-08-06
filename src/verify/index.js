import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { loadContract } from '../contract/index.js';
import { scanSource } from './scan.js';
import { collectLocalComponents } from './local-components.js';
import { resolveExcludePrefixes, assertSafeScanPrefix } from './excludes.js';
import {
  diffAgainstBaseline,
  findingsToBaseline,
  loadBaseline,
  writeBaseline,
} from './baseline.js';
import { CODES } from './codes.js';

const SOURCE_RE = /\.(tsx|jsx|ts|js|css)$/;
const TEST_FILE_RE = /\.(?:test|spec)\.(?:tsx|jsx|ts|js)$/;
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '__tests__',
]);

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (SOURCE_RE.test(name) && !TEST_FILE_RE.test(name)) acc.push(full);
  }
  return acc;
}

/**
 * @typedef {{
 *   baselinePath?: string,
 *   writeBaselinePath?: string,
 *   maxNew?: number,
 * }} VerifyOptions
 */

/**
 * @param {string} targetPath fixture root or project root containing decree.contract.json
 * @param {VerifyOptions} [options]
 */
export function verifyPath(targetPath, options = {}) {
  const contractPath = join(targetPath, 'decree.contract.json');
  if (!existsSync(contractPath)) {
    return {
      ok: false,
      exitCode: 2,
      findings: [
        {
          code: CODES.INVALID_CONTRACT,
          message: `No decree.contract.json in ${targetPath}`,
          file: contractPath,
          line: 0,
        },
      ],
      contractPath: null,
      newFindings: [],
      baselinedFindings: [],
      newCount: 0,
      baselinedCount: 0,
    };
  }

  let contract;
  try {
    contract = loadContract(contractPath);
  } catch (err) {
    return {
      ok: false,
      exitCode: 2,
      findings: [
        {
          code: CODES.INVALID_CONTRACT,
          message: err instanceof Error ? err.message : String(err),
          file: contractPath,
          line: 0,
        },
      ],
      contractPath,
      newFindings: [],
      baselinedFindings: [],
      newCount: 0,
      baselinedCount: 0,
    };
  }

  const srcRoot = existsSync(join(targetPath, 'src'))
    ? join(targetPath, 'src')
    : targetPath;
  const scan = contract.scan || {};
  let excludePrefixes;
  try {
    excludePrefixes = resolveExcludePrefixes(scan);
  } catch (err) {
    return {
      ok: false,
      exitCode: 2,
      findings: [
        {
          code: CODES.INVALID_CONTRACT,
          message: err instanceof Error ? err.message : String(err),
          file: contractPath,
          line: 0,
        },
      ],
      contractPath,
      newFindings: [],
      baselinedFindings: [],
      newCount: 0,
      baselinedCount: 0,
    };
  }
  const profile = scan.profile === 'app' ? 'app' : 'strict';
  let localPrefixes;
  try {
    localPrefixes =
      Array.isArray(scan.localComponentPrefixes) &&
      scan.localComponentPrefixes.length > 0
        ? scan.localComponentPrefixes.map((p) =>
            assertSafeScanPrefix(p, 'scan.localComponentPrefixes'),
          )
        : ['src/components'];
  } catch (err) {
    return {
      ok: false,
      exitCode: 2,
      findings: [
        {
          code: CODES.INVALID_CONTRACT,
          message: err instanceof Error ? err.message : String(err),
          file: contractPath,
          line: 0,
        },
      ],
      contractPath,
      newFindings: [],
      baselinedFindings: [],
      newCount: 0,
      baselinedCount: 0,
    };
  }
  const localComponents =
    profile === 'app'
      ? collectLocalComponents(targetPath, localPrefixes, excludePrefixes)
      : new Set();
  const files = walk(srcRoot).filter((file) => {
    const rel = relative(targetPath, file).replace(/\\/g, '/');
    return !excludePrefixes.some((p) => {
      const prefix = p.endsWith('/') ? p.slice(0, -1) : p;
      return rel === prefix || rel.startsWith(`${prefix}/`);
    });
  });
  /** @type {import('./scan.js').Finding[]} */
  const findings = [];

  for (const file of files) {
    const rel = relative(targetPath, file).replace(/\\/g, '/');
    const source = readFileSync(file, 'utf8');
    findings.push(...scanSource(source, rel, contract, { localComponents }));
  }

  // --- write baseline (exit 0 after successful write) ---
  if (options.writeBaselinePath) {
    try {
      const out = resolve(options.writeBaselinePath);
      writeBaseline(out, findingsToBaseline(findings));
      return {
        ok: true,
        exitCode: 0,
        findings,
        contractPath,
        filesScanned: files.length,
        newFindings: findings,
        baselinedFindings: [],
        newCount: findings.length,
        baselinedCount: 0,
        wroteBaseline: out,
      };
    } catch (err) {
      return {
        ok: false,
        exitCode: 2,
        findings: [
          {
            code: CODES.INVALID_CONTRACT,
            message: err instanceof Error ? err.message : String(err),
            file: options.writeBaselinePath,
            line: 0,
          },
        ],
        contractPath,
        filesScanned: files.length,
        newFindings: [],
        baselinedFindings: [],
        newCount: 0,
        baselinedCount: 0,
      };
    }
  }

  const useBaseline = Boolean(options.baselinePath);
  const useMaxNew = options.maxNew !== undefined && options.maxNew !== null;

  if (!useBaseline && !useMaxNew) {
    return {
      ok: findings.length === 0,
      exitCode: findings.length === 0 ? 0 : 1,
      findings,
      contractPath,
      filesScanned: files.length,
      newFindings: findings,
      baselinedFindings: [],
      newCount: findings.length,
      baselinedCount: 0,
    };
  }

  /** @type {import('./scan.js').Finding[]} */
  let newFindings = findings;
  /** @type {import('./scan.js').Finding[]} */
  let baselinedFindings = [];

  if (useBaseline) {
    try {
      const baseline = loadBaseline(resolve(options.baselinePath));
      const diff = diffAgainstBaseline(findings, baseline);
      newFindings = /** @type {import('./scan.js').Finding[]} */ (
        diff.newFindings
      );
      baselinedFindings = /** @type {import('./scan.js').Finding[]} */ (
        diff.baselinedFindings
      );
    } catch (err) {
      return {
        ok: false,
        exitCode: 2,
        findings: [
          {
            code: CODES.INVALID_CONTRACT,
            message: err instanceof Error ? err.message : String(err),
            file: options.baselinePath,
            line: 0,
          },
        ],
        contractPath,
        filesScanned: files.length,
        newFindings: [],
        baselinedFindings: [],
        newCount: 0,
        baselinedCount: 0,
      };
    }
  }

  let maxNew = 0;
  if (useMaxNew) {
    if (
      typeof options.maxNew !== 'number' ||
      !Number.isInteger(options.maxNew) ||
      options.maxNew < 0
    ) {
      return {
        ok: false,
        exitCode: 2,
        findings: [
          {
            code: CODES.INVALID_CONTRACT,
            message: `Invalid --max-new value: ${String(options.maxNew)}`,
            file: contractPath,
            line: 0,
          },
        ],
        contractPath,
        filesScanned: files.length,
        newFindings,
        baselinedFindings,
        newCount: newFindings.length,
        baselinedCount: baselinedFindings.length,
      };
    }
    maxNew = options.maxNew;
  }

  // With baseline only: fail if any new. With max-new: fail if new > maxNew.
  const failed = useMaxNew
    ? newFindings.length > maxNew
    : newFindings.length > 0;

  return {
    ok: !failed,
    exitCode: failed ? 1 : 0,
    findings,
    contractPath,
    filesScanned: files.length,
    newFindings,
    baselinedFindings,
    newCount: newFindings.length,
    baselinedCount: baselinedFindings.length,
  };
}

export { CODES };
