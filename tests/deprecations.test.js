import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateContract } from '../src/contract/index.js';
import { scanSource } from '../src/verify/scan.js';
import { CODES } from '../src/verify/codes.js';
import {
  describeAllowedPrimitive,
  isAllowedPrimitive,
  listPrimitives,
  listTokens,
  validateSnippet,
} from '../src/mcp/allowlist.js';
import {
  buildContractFromPackage,
  preparePackage,
  sourcesScaffoldTemplate,
} from '../src/init/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const decreeBin = join(root, 'bin/decree.js');

const contract = {
  version: 1,
  components: ['Button', 'LegacyButton'],
  tokens: [{ name: '--primary' }, { name: '--brand-blue' }],
  nativeElementMap: { button: 'Button' },
  deprecations: {
    components: {
      LegacyButton: {
        replacement: 'Button',
        reason: 'Merged into Button',
        since: '2026-08-01',
        removeAfter: '2026-12-01',
      },
    },
    tokens: {
      '--brand-blue': {
        replacement: '--primary',
        reason: 'Renamed to semantic token',
        since: '2026-08-01',
      },
    },
  },
};

describe('deprecation contract validation', () => {
  it('loads a valid contract with deprecations', () => {
    validateContract(contract);
  });

  it('allows a contract with no deprecations field', () => {
    validateContract({
      version: 1,
      components: ['Button'],
      tokens: [{ name: '--primary' }],
      nativeElementMap: {},
    });
  });

  it('rejects deprecating an unknown component or token', () => {
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: {
            components: { Ghost: { reason: 'gone' } },
          },
        }),
      /deprecations\.components\.Ghost is not in contract\.components/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: {
            tokens: { '--ghost': { reason: 'gone' } },
          },
        }),
      /deprecations\.tokens\.--ghost is not in contract\.tokens/,
    );
  });

  it('requires replacement to exist and not be self', () => {
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: {
            components: { LegacyButton: { replacement: 'LegacyButton' } },
          },
        }),
      /must not equal the deprecated name/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: {
            components: { LegacyButton: { replacement: 'Ghost' } },
          },
        }),
      /replacement "Ghost" is not in contract\.components/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: {
            tokens: { '--brand-blue': { replacement: '--brand-blue' } },
          },
        }),
      /must not equal the deprecated name/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: {
            tokens: { '--brand-blue': { replacement: '--ghost' } },
          },
        }),
      /replacement "--ghost" is not in contract\.tokens/,
    );
  });

  it('rejects unknown keys, arrays, and empty strings', () => {
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: { components: { LegacyButton: { extra: 'nope' } } },
        }),
      /unknown key "extra"/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: { components: [] },
        }),
      /deprecations\.components must be an object/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          deprecations: {
            components: { LegacyButton: { reason: '' } },
          },
        }),
      /must be a non-empty string/,
    );
  });
});

describe('deprecation scan', () => {
  it('flags a deprecated JSX component via AST', () => {
    const findings = scanSource(
      `export function App() { return <LegacyButton>x</LegacyButton>; }\n`,
      'src/App.tsx',
      contract,
    );
    const deprecated = findings.filter(
      (f) => f.code === CODES.DEPRECATED_COMPONENT,
    );
    assert.equal(deprecated.length, 1, JSON.stringify(findings));
    assert.equal(
      deprecated[0].message,
      'Deprecated component <LegacyButton> — use <Button> instead (Merged into Button; since 2026-08-01; remove after 2026-12-01)',
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
    );
  });

  it('flags an import alias that resolves to a deprecated component', () => {
    const findings = scanSource(
      `import { LegacyButton as OldBtn } from '@acme/ui';\nexport function App() { return <OldBtn />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.ok(
      findings.some(
        (f) =>
          f.code === CODES.DEPRECATED_COMPONENT &&
          /<LegacyButton>/.test(f.message),
      ),
      JSON.stringify(findings),
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
    );
  });

  it('does not flag an allowlisted non-deprecated component', () => {
    const findings = scanSource(
      `export function App() { return <Button>ok</Button>; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.DEPRECATED_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
    );
  });

  it('still flags unknown components as UNKNOWN_COMPONENT', () => {
    const findings = scanSource(
      `export function App() { return <ForgedWidget />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.ok(
      findings.some(
        (f) =>
          f.code === CODES.UNKNOWN_COMPONENT && /ForgedWidget/.test(f.message),
      ),
      JSON.stringify(findings),
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.DEPRECATED_COMPONENT).length,
      0,
    );
  });

  it('flags deprecated tokens in CSS and JS var() usage', () => {
    const css = scanSource(
      `.x { color: var(--brand-blue); background: var(--primary); }\n`,
      'src/a.css',
      contract,
    );
    assert.ok(
      css.some(
        (f) =>
          f.code === CODES.DEPRECATED_TOKEN && /--brand-blue/.test(f.message),
      ),
      JSON.stringify(css),
    );
    assert.equal(
      css.filter((f) => f.code === CODES.UNKNOWN_TOKEN).length,
      0,
    );
    assert.equal(
      css.filter((f) => f.code === CODES.DEPRECATED_TOKEN).length,
      1,
    );

    const js = scanSource(
      `export function App() { return <Button style={{ color: 'var(--brand-blue)' }} />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.ok(
      js.some(
        (f) =>
          f.code === CODES.DEPRECATED_TOKEN &&
          f.message ===
            'Deprecated token <--brand-blue> — use <--primary> instead (Renamed to semantic token; since 2026-08-01)',
      ),
      JSON.stringify(js),
    );
    assert.equal(js.filter((f) => f.code === CODES.UNKNOWN_TOKEN).length, 0);
  });

  it('still flags unknown tokens as UNKNOWN_TOKEN', () => {
    const findings = scanSource(
      `.x { color: var(--not-real); }\n`,
      'src/a.css',
      contract,
    );
    assert.ok(
      findings.some(
        (f) => f.code === CODES.UNKNOWN_TOKEN && /--not-real/.test(f.message),
      ),
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.DEPRECATED_TOKEN).length,
      0,
    );
  });
});

describe('deprecation MCP surface', () => {
  it('lists primitives and tokens with deprecation notices', () => {
    const primitives = listPrimitives(contract);
    const legacy = primitives.find((p) => p.name === 'LegacyButton');
    const button = primitives.find((p) => p.name === 'Button');
    assert.equal(legacy?.deprecated, true);
    assert.equal(legacy?.deprecation?.replacement, 'Button');
    assert.equal(legacy?.allowed, true);
    assert.equal(button?.deprecated, false);
    assert.equal(button?.deprecation, undefined);

    const tokens = listTokens(contract);
    const brand = tokens.find((t) => t.name === '--brand-blue');
    const primary = tokens.find((t) => t.name === '--primary');
    assert.equal(brand?.deprecated, true);
    assert.equal(brand?.deprecation?.replacement, '--primary');
    assert.equal(primary?.deprecated, false);
  });

  it('keeps deprecated names allowed and includes the notice', () => {
    assert.equal(isAllowedPrimitive(contract, 'LegacyButton'), true);
    assert.equal(isAllowedPrimitive(contract, 'Button'), true);
    const info = describeAllowedPrimitive(contract, 'LegacyButton');
    assert.equal(info.allowed, true);
    assert.equal(info.deprecated, true);
    assert.equal(info.deprecation?.replacement, 'Button');
    assert.match(info.message, /deprecated/i);
    assert.match(info.message, /LegacyButton/);
  });

  it('validateSnippet fails on deprecated usage', () => {
    const result = validateSnippet(
      contract,
      `export function App() { return <LegacyButton />; }\n`,
    );
    assert.equal(result.ok, false);
    assert.ok(
      result.findings.some((f) => f.code === CODES.DEPRECATED_COMPONENT),
      JSON.stringify(result.findings),
    );
  });
});

describe('deprecation CLI and sources', () => {
  it('decree verify exits 1 with DECREE_DEPRECATED_COMPONENT', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-deprecate-verify-'));
    try {
      mkdirSync(join(dir, 'src'), { recursive: true });
      writeFileSync(
        join(dir, 'decree.contract.json'),
        `${JSON.stringify(contract, null, 2)}\n`,
      );
      writeFileSync(
        join(dir, 'src', 'App.tsx'),
        `export function App() { return <LegacyButton />; }\n`,
      );
      const result = spawnSync(process.execPath, [decreeBin, 'verify', dir], {
        encoding: 'utf8',
      });
      assert.equal(result.status, 1, result.stderr + result.stdout);
      assert.match(result.stderr, /DECREE_DEPRECATED_COMPONENT/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sources scaffold includes deprecations; prepare copies notices and --check detects drift', () => {
    const template = sourcesScaffoldTemplate();
    assert.deepEqual(template.deprecations, { components: {}, tokens: {} });

    const dir = mkdtempSync(join(tmpdir(), 'decree-deprecate-prep-'));
    try {
      mkdirSync(join(dir, 'src', 'components', 'ui'), { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: '@fixtures/deprecate', version: '1.0.0', type: 'module' }),
      );
      writeFileSync(
        join(dir, 'tokens.json'),
        `${JSON.stringify({
          primary: { $value: '#111' },
          brand: { blue: { $value: '#00f' } },
        })}\n`,
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'button.tsx'),
        'export function Button() { return null; }\n',
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'legacy-button.tsx'),
        'export function LegacyButton() { return null; }\n',
      );
      writeFileSync(
        join(dir, 'decree.sources.json'),
        `${JSON.stringify(
          {
            version: 1,
            components: { include: ['src/components/ui'] },
            tokens: { mode: 'dtcg-only', files: ['tokens.json'] },
            deprecations: {
              components: {
                LegacyButton: {
                  replacement: 'Button',
                  reason: 'Merged into Button',
                  since: '2026-08-01',
                },
              },
              tokens: {
                '--brand-blue': {
                  replacement: '--primary',
                  reason: 'Renamed to semantic token',
                },
              },
            },
          },
          null,
          2,
        )}\n`,
      );

      const built = buildContractFromPackage(dir);
      validateContract(built.contract);
      assert.equal(
        built.contract.deprecations?.components?.LegacyButton?.replacement,
        'Button',
      );
      assert.equal(
        built.contract.deprecations?.tokens?.['--brand-blue']?.replacement,
        '--primary',
      );

      const written = preparePackage(dir, { force: true });
      assert.equal(written.ok, true);
      assert.ok(existsSync(join(dir, 'decree.contract.json')));

      const checkOk = preparePackage(dir, { check: true });
      assert.equal(checkOk.ok, true, checkOk.message);

      const contractPath = join(dir, 'decree.contract.json');
      const drifted = JSON.parse(readFileSync(contractPath, 'utf8'));
      drifted.deprecations.components.LegacyButton.reason = 'changed notice';
      writeFileSync(contractPath, `${JSON.stringify(drifted, null, 2)}\n`);

      const checkBad = preparePackage(dir, { check: true });
      assert.equal(checkBad.ok, false);
      assert.match(checkBad.message, /drift/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
