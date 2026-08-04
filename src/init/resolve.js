import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * @param {string} spec Path to package root, or npm package name
 * @param {string} fromDir Directory to start node_modules walk from
 * @returns {string} Absolute package root
 */
export function resolvePackageRoot(spec, fromDir = process.cwd()) {
  const abs = resolve(fromDir, spec);
  if (existsSync(join(abs, 'package.json'))) {
    return abs;
  }
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    throw new Error(`No package.json in ${abs}`);
  }

  // Treat as package name (e.g. @scope/name or name)
  let dir = resolve(fromDir);
  for (;;) {
    const candidate = join(dir, 'node_modules', ...spec.split('/'));
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Could not resolve package "${spec}" from ${fromDir} (no local path or node_modules match)`,
  );
}
