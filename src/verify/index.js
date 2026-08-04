import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadContract } from '../contract/index.js';
import { scanSource } from './scan.js';
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
 * @param {string} targetPath fixture root or project root containing decree.contract.json
 */
export function verifyPath(targetPath) {
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
    };
  }

  const srcRoot = existsSync(join(targetPath, 'src'))
    ? join(targetPath, 'src')
    : targetPath;
  const files = walk(srcRoot);
  /** @type {import('./scan.js').Finding[]} */
  const findings = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const rel = relative(targetPath, file);
    findings.push(...scanSource(source, rel, contract));
  }

  return {
    ok: findings.length === 0,
    exitCode: findings.length === 0 ? 0 : 1,
    findings,
    contractPath,
    filesScanned: files.length,
  };
}

export { CODES };
