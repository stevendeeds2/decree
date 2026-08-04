import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/verify/scan.js';
import { collectImportAliases } from '../src/verify/imports.js';
import { CODES } from '../src/verify/codes.js';

const muiContract = {
  version: 1,
  components: ['Link', 'Button', 'Container'],
  tokens: [],
  nativeElementMap: {},
};

describe('collectImportAliases', () => {
  it('maps default imports from package subpaths', () => {
    const map = collectImportAliases(
      `import MaterialUILink from '@mui/material/Link';\n`,
    );
    assert.equal(map.get('MaterialUILink'), 'Link');
  });

  it('maps named imports and aliases from packages', () => {
    const map = collectImportAliases(
      `import { Link as MaterialUILink, Button } from '@mui/material';\n`,
    );
    assert.equal(map.get('MaterialUILink'), 'Link');
    assert.equal(map.get('Button'), 'Button');
  });

  it('ignores relative and @/ path-alias imports', () => {
    const map = collectImportAliases(
      `import Link from './Link';\nimport X from '@/components/Link';\n`,
    );
    assert.equal(map.size, 0);
  });
});

describe('import-aware allowlisting in scanSource', () => {
  it('allows default-import aliases of allowlisted components', () => {
    const source = `
import MaterialUILink from '@mui/material/Link';
export function App() {
  return <MaterialUILink href="/about">Go</MaterialUILink>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', muiContract);
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('allows named-import aliases of allowlisted components', () => {
    const source = `
import { Link as MaterialUILink } from '@mui/material';
export function App() {
  return <MaterialUILink href="/about">Go</MaterialUILink>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', muiContract);
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('still flags unknown components with no resolving import', () => {
    const source = `
export function App() {
  return <ProTip />;
}
`;
    const findings = scanSource(source, 'src/App.tsx', muiContract);
    assert.ok(
      findings.some(
        (f) => f.code === CODES.UNKNOWN_COMPONENT && /ProTip/.test(f.message),
      ),
      JSON.stringify(findings),
    );
  });

  it('does not treat relative re-exports as allowlisted', () => {
    const source = `
import FancyLink from './FancyLink';
export function App() {
  return <FancyLink href="/x" />;
}
`;
    const findings = scanSource(source, 'src/App.tsx', muiContract);
    assert.ok(
      findings.some(
        (f) =>
          f.code === CODES.UNKNOWN_COMPONENT && /FancyLink/.test(f.message),
      ),
      JSON.stringify(findings),
    );
  });
});
