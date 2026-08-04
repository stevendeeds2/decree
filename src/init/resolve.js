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

  // Package name path — never allow .. / absolute segments (path escape)
  const nameParts = spec.split(/[/\\]/);
  if (
    nameParts.includes('..') ||
    nameParts.includes('') ||
    spec.startsWith('/') ||
    /^[A-Za-z]:/.test(spec)
  ) {
    throw new Error(`Invalid package name "${spec}"`);
  }

  // Treat as package name (e.g. @scope/name or name)
  let dir = resolve(fromDir);
  for (;;) {
    const nm = join(dir, 'node_modules');
    const candidate = join(nm, ...nameParts);
    if (existsSync(join(candidate, 'package.json'))) {
      // Containment: resolved package must live under this node_modules
      const rel = candidate.slice(nm.length).replace(/^[/\\]/, '');
      if (rel.split(/[/\\]/).includes('..')) {
        throw new Error(`Invalid package name "${spec}"`);
      }
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
