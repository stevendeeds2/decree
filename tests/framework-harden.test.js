import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanSource } from '../src/verify/scan.js';
import { collectImportBindings } from '../src/verify/imports.js';
import { resolvePackageRoot } from '../src/init/resolve.js';
import { extractComponents } from '../src/init/extract.js';
import { CODES } from '../src/verify/codes.js';

const bare = {
  version: 1,
  components: ['Button'],
  tokens: [],
  nativeElementMap: {},
};

describe('framework allowlist hardening', () => {
  it('flags bare <Link> when not on contract and not imported from a host package', () => {
    const findings = scanSource(
      `export function App() { return <Link href="/" />; }\n`,
      'src/App.tsx',
      bare,
    );
    assert.ok(
      findings.some(
        (f) => f.code === CODES.UNKNOWN_COMPONENT && /Link/.test(f.message),
      ),
      JSON.stringify(findings),
    );
  });

  it('flags bare <ThemeProvider> / <CssBaseline> without import or contract', () => {
    const findings = scanSource(
      `export function App() { return <ThemeProvider><CssBaseline /></ThemeProvider>; }\n`,
      'src/App.tsx',
      bare,
    );
    const unknowns = findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT);
    assert.ok(unknowns.some((f) => /ThemeProvider/.test(f.message)));
    assert.ok(unknowns.some((f) => /CssBaseline/.test(f.message)));
  });

  it('allows Next.js Link when imported from next/link', () => {
    const source = `
import Link from 'next/link';
export function App() { return <Link href="/" />; }
`;
    const findings = scanSource(source, 'src/App.tsx', bare);
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('allows lucide-react / recharts hosts when imported', () => {
    const findings = scanSource(
      `import { Search } from 'lucide-react';
import { AreaChart } from 'recharts';
export function App() { return <><Search /><AreaChart /></>; }\n`,
      'src/App.tsx',
      bare,
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('allows named hosts from @mui/material-nextjs', () => {
    const source = `
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
export function Root({ children }) {
  return <AppRouterCacheProvider>{children}</AppRouterCacheProvider>;
}
`;
    const findings = scanSource(source, 'src/layout.tsx', bare);
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('still allows true React runtime tags without imports', () => {
    const findings = scanSource(
      `export function App() { return <Suspense><Fragment /></Suspense>; }\n`,
      'src/App.tsx',
      bare,
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('collectImportBindings marks next/link locals as hosts', () => {
    const { hosts, aliases } = collectImportBindings(
      `import Link from 'next/link';\nimport MaterialUILink from '@mui/material/Link';\n`,
    );
    assert.ok(hosts.has('Link'));
    assert.equal(aliases.get('MaterialUILink'), 'Link');
  });
});

describe('init path containment', () => {
  /** @type {string} */
  let root;
  /** @type {string} */
  let outside;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'decree-init-root-'));
    outside = mkdtempSync(join(tmpdir(), 'decree-init-out-'));
    mkdirSync(join(outside, 'Evil'), { recursive: true });
    writeFileSync(
      join(outside, 'Evil', 'Leaked.js'),
      `export function Leaked() { return null; }\n`,
    );
    writeFileSync(
      join(outside, 'package.json'),
      JSON.stringify({ name: 'evil-outside', version: '1.0.0' }),
    );
    mkdirSync(join(root, 'pkg'), { recursive: true });
    writeFileSync(
      join(root, 'pkg', 'package.json'),
      JSON.stringify({
        name: '@test/pkg',
        version: '1.0.0',
        exports: { './x': '../Evil/Leaked.js' },
      }),
    );
    writeFileSync(
      join(root, 'pkg', 'Button.js'),
      `export function Button() { return null; }\n`,
    );
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it('does not pull components from exports outside the package root', () => {
    // Place Evil as sibling so ../Evil would escape pkg/
    mkdirSync(join(root, 'Evil'), { recursive: true });
    writeFileSync(
      join(root, 'Evil', 'Leaked.js'),
      `export function Leaked() { return null; }\n`,
    );
    const names = extractComponents(join(root, 'pkg'));
    assert.ok(names.includes('Button'));
    assert.ok(!names.includes('Leaked'), names.join(','));
  });

  it('rejects package names containing .. when not a real package path', () => {
    assert.throws(
      () => resolvePackageRoot('foo/../../evil-pkg', root),
      /invalid package name/i,
    );
  });
});
