import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectLocalComponents } from '../src/verify/local-components.js';
import { scanSource } from '../src/verify/scan.js';
import { verifyPath } from '../src/verify/index.js';
import { validateContract } from '../src/contract/index.js';
import { CODES } from '../src/verify/codes.js';

const baseContract = {
  version: 1,
  components: ['Button', 'Link'],
  tokens: [],
  nativeElementMap: {},
};

describe('collectLocalComponents', () => {
  /** @type {string} */
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'decree-local-'));
    mkdirSync(join(root, 'src/components'), { recursive: true });
    mkdirSync(join(root, 'src/components/ui'), { recursive: true });
    writeFileSync(
      join(root, 'src/components/ProTip.tsx'),
      `function LightBulbIcon() { return null; }\nexport default function ProTip() { return <LightBulbIcon />; }\n`,
    );
    writeFileSync(
      join(root, 'src/components/Copyright.tsx'),
      `export default function Copyright() { return null; }\n`,
    );
    writeFileSync(
      join(root, 'src/components/ui/button.tsx'),
      `export function Button() { return null; }\n`,
    );
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('collects basename and PascalCase declarations under prefixes', () => {
    const names = collectLocalComponents(root, ['src/components'], [
      'src/components/ui',
    ]);
    assert.ok(names.has('ProTip'), [...names]);
    assert.ok(names.has('Copyright'), [...names]);
    assert.ok(names.has('LightBulbIcon'), [...names]);
    assert.ok(!names.has('Button'), 'ui/ should be skipped');
  });
});

describe('scan profile strict vs app', () => {
  it('strict (default) flags local shell names', () => {
    const findings = scanSource(
      `export function App() { return <ProTip />; }\n`,
      'src/app/page.tsx',
      baseContract,
    );
    assert.ok(
      findings.some((f) => f.code === CODES.UNKNOWN_COMPONENT),
      JSON.stringify(findings),
    );
  });

  it('app profile allows discovered local components', () => {
    const findings = scanSource(
      `export function App() { return <ProTip />; }\n`,
      'src/app/page.tsx',
      baseContract,
      { localComponents: new Set(['ProTip']) },
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('app profile still flags undiscovered inventions', () => {
    const findings = scanSource(
      `export function App() { return <ForgedWidget />; }\n`,
      'src/app/page.tsx',
      baseContract,
      { localComponents: new Set(['ProTip']) },
    );
    assert.ok(
      findings.some(
        (f) =>
          f.code === CODES.UNKNOWN_COMPONENT && /ForgedWidget/.test(f.message),
      ),
    );
  });
});

describe('verifyPath with scan.profile app', () => {
  /** @type {string} */
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'decree-app-profile-'));
    mkdirSync(join(root, 'src/components'), { recursive: true });
    mkdirSync(join(root, 'src/app'), { recursive: true });
    writeFileSync(
      join(root, 'decree.contract.json'),
      JSON.stringify({
        ...baseContract,
        scan: { profile: 'app', localComponentPrefixes: ['src/components'] },
      }),
    );
    writeFileSync(
      join(root, 'src/components/ProTip.tsx'),
      `export default function ProTip() { return <span>tip</span>; }\n`,
    );
    writeFileSync(
      join(root, 'src/app/page.tsx'),
      `import ProTip from '@/components/ProTip';\nexport default function Page() { return <ProTip />; }\n`,
    );
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('passes when only local shells are used outside the DS allowlist', () => {
    const result = verifyPath(root);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });
});

describe('contract scan.profile validation', () => {
  it('rejects unknown profile values', () => {
    assert.throws(
      () =>
        validateContract({
          ...baseContract,
          scan: { profile: 'loose' },
        }),
      /profile/i,
    );
  });

  it('accepts profile app', () => {
    validateContract({
      ...baseContract,
      scan: { profile: 'app' },
    });
  });
});
