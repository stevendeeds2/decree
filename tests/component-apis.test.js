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
  listPrimitives,
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
  components: ['Button', 'Input'],
  tokens: [{ name: '--primary' }],
  nativeElementMap: { button: 'Button' },
  componentApis: {
    Button: {
      props: {
        variant: { enum: ['primary', 'secondary'] },
        size: { enum: ['sm', 'md', 'lg'] },
        disabled: { type: 'boolean' },
      },
      forbiddenCombinations: [{ variant: 'secondary', size: 'lg' }],
    },
  },
};

describe('component API contract validation', () => {
  it('loads a valid contract with and without componentApis', () => {
    validateContract(contract);
    validateContract({
      version: 1,
      components: ['Button'],
      tokens: [],
      nativeElementMap: {},
    });
  });

  it('rejects an API key that is not on the allowlist', () => {
    assert.throws(
      () =>
        validateContract({
          ...contract,
          componentApis: { Ghost: { props: { x: { type: 'string' } } } },
        }),
      /componentApis\.Ghost is not in contract\.components/,
    );
  });

  it('rejects unknown keys, empty enums, and combo props that are not defined', () => {
    assert.throws(
      () =>
        validateContract({
          ...contract,
          componentApis: { Button: { extra: true } },
        }),
      /unknown key "extra"/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          componentApis: { Button: { props: { variant: { enum: [] } } } },
        }),
      /enum must be a non-empty array/,
    );
    assert.throws(
      () =>
        validateContract({
          ...contract,
          componentApis: {
            Button: {
              props: { variant: { enum: ['primary'] } },
              forbiddenCombinations: [{ size: 'lg' }],
            },
          },
        }),
      /unknown prop "size"/,
    );
  });
});

describe('component API scan', () => {
  it('flags an unknown static prop', () => {
    const findings = scanSource(
      `export function App() { return <Button forged />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.ok(
      findings.some(
        (f) => f.code === CODES.UNKNOWN_PROP && /forged/.test(f.message),
      ),
      JSON.stringify(findings),
    );
  });

  it('flags an illegal static enum value', () => {
    const findings = scanSource(
      `export function App() { return <Button variant="ghost" />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.ok(
      findings.some((f) => f.code === CODES.INVALID_PROP_VALUE),
      JSON.stringify(findings),
    );
  });

  it('flags a forbidden static combination', () => {
    const findings = scanSource(
      `export function App() { return <Button variant="secondary" size="lg" />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.ok(
      findings.some((f) => f.code === CODES.INVALID_PROP_COMBO),
      JSON.stringify(findings),
    );
  });

  it('ignores spreads and dynamic values', () => {
    const findings = scanSource(
      `export function App({ variant, extra }) { return <Button {...extra} variant={variant} />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.equal(
      findings.filter((f) =>
        [
          CODES.UNKNOWN_PROP,
          CODES.INVALID_PROP_VALUE,
          CODES.INVALID_PROP_COMBO,
        ].includes(f.code),
      ).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('does not flag className or onClick', () => {
    const findings = scanSource(
      `export function App() { return <Button className="x" onClick={() => {}} variant="primary" />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.equal(
      findings.filter((f) =>
        [CODES.UNKNOWN_PROP, CODES.INVALID_PROP_VALUE].includes(f.code),
      ).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('does not enforce props when the component has no API entry', () => {
    const findings = scanSource(
      `export function App() { return <Input forged />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_PROP).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('allows a legal static usage', () => {
    const findings = scanSource(
      `export function App() { return <Button variant="primary" size="md" disabled />; }\n`,
      'src/App.tsx',
      contract,
    );
    assert.equal(
      findings.filter((f) =>
        [
          CODES.UNKNOWN_PROP,
          CODES.INVALID_PROP_VALUE,
          CODES.INVALID_PROP_COMBO,
        ].includes(f.code),
      ).length,
      0,
      JSON.stringify(findings),
    );
  });
});

describe('component API MCP surface', () => {
  it('lists primitives with api when defined', () => {
    const primitives = listPrimitives(contract);
    const button = primitives.find((p) => p.name === 'Button');
    const input = primitives.find((p) => p.name === 'Input');
    assert.equal(button?.api?.props?.variant?.enum?.[0], 'primary');
    assert.equal(input?.api, undefined);
  });

  it('describeAllowedPrimitive includes api', () => {
    const info = describeAllowedPrimitive(contract, 'Button');
    assert.equal(info.allowed, true);
    assert.deepEqual(info.api?.props?.size?.enum, ['sm', 'md', 'lg']);
  });

  it('validateSnippet fails on unknown props', () => {
    const result = validateSnippet(
      contract,
      `export function App() { return <Button forged />; }\n`,
    );
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.code === CODES.UNKNOWN_PROP));
  });
});

describe('component API CLI and sources', () => {
  it('decree verify exits 1 with DECREE_UNKNOWN_PROP', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-api-verify-'));
    try {
      mkdirSync(join(dir, 'src'), { recursive: true });
      writeFileSync(
        join(dir, 'decree.contract.json'),
        `${JSON.stringify(contract, null, 2)}\n`,
      );
      writeFileSync(
        join(dir, 'src', 'App.tsx'),
        `export function App() { return <Button forged />; }\n`,
      );
      const result = spawnSync(process.execPath, [decreeBin, 'verify', dir], {
        encoding: 'utf8',
      });
      assert.equal(result.status, 1, result.stderr + result.stdout);
      assert.match(result.stderr, /DECREE_UNKNOWN_PROP/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sources scaffold includes componentApis; prepare copies and --check detects drift', () => {
    const template = sourcesScaffoldTemplate();
    assert.deepEqual(template.componentApis, {});

    const dir = mkdtempSync(join(tmpdir(), 'decree-api-prep-'));
    try {
      mkdirSync(join(dir, 'src', 'components', 'ui'), { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: '@fixtures/apis', version: '1.0.0', type: 'module' }),
      );
      writeFileSync(
        join(dir, 'tokens.json'),
        `${JSON.stringify({ primary: { $value: '#111' } })}\n`,
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'button.tsx'),
        'export function Button() { return null; }\n',
      );
      writeFileSync(
        join(dir, 'decree.sources.json'),
        `${JSON.stringify(
          {
            version: 1,
            components: { include: ['src/components/ui'] },
            tokens: { mode: 'dtcg-only', files: ['tokens.json'] },
            componentApis: {
              Button: {
                props: { variant: { enum: ['primary', 'secondary'] } },
              },
            },
          },
          null,
          2,
        )}\n`,
      );

      const built = buildContractFromPackage(dir);
      validateContract(built.contract);
      assert.deepEqual(
        built.contract.componentApis?.Button?.props?.variant?.enum,
        ['primary', 'secondary'],
      );

      const written = preparePackage(dir, { force: true });
      assert.equal(written.ok, true);
      assert.ok(existsSync(join(dir, 'decree.contract.json')));

      const checkOk = preparePackage(dir, { check: true });
      assert.equal(checkOk.ok, true, checkOk.message);

      const contractPath = join(dir, 'decree.contract.json');
      const drifted = JSON.parse(readFileSync(contractPath, 'utf8'));
      drifted.componentApis.Button.props.variant.enum = ['primary'];
      writeFileSync(contractPath, `${JSON.stringify(drifted, null, 2)}\n`);

      const checkBad = preparePackage(dir, { check: true });
      assert.equal(checkBad.ok, false);
      assert.match(checkBad.message, /drift/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
