import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
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
const shadcnApp = join(root, 'demos/shadcn/apps/app');

const base = {
  version: 1,
  components: ['Button', 'Input'],
  tokens: [{ name: '--primary' }],
  nativeElementMap: { button: 'Button' },
};

const restyleOn = {
  ...base,
  restyle: true,
};

describe('restyle contract validation', () => {
  it('loads a contract with restyle true, object, or missing', () => {
    validateContract(base);
    validateContract(restyleOn);
    validateContract({
      ...base,
      restyle: { style: true, sx: false, arbitraryClass: true },
    });
  });

  it('rejects unknown restyle keys', () => {
    assert.throws(
      () => validateContract({ ...base, restyle: { css: true } }),
      /unknown key/,
    );
  });
});

describe('restyle scan', () => {
  it('flags style= on an allowlisted primitive', () => {
    const findings = scanSource(
      `export function App() { return <Button style={{ color: 'red' }}>Go</Button>; }\n`,
      'App.tsx',
      restyleOn,
    );
    assert.ok(findings.some((f) => f.code === CODES.RESTYLE_STYLE));
  });

  it('flags sx= on an allowlisted primitive', () => {
    const findings = scanSource(
      `export function App() { return <Button sx={{ color: 'red' }}>Go</Button>; }\n`,
      'App.tsx',
      restyleOn,
    );
    assert.ok(findings.some((f) => f.code === CODES.RESTYLE_SX));
  });

  it('flags arbitrary size and hex class on a primitive, including cn()', () => {
    const size = scanSource(
      `export function App() { return <Button className="w-[32px]">Go</Button>; }\n`,
      'App.tsx',
      restyleOn,
    );
    assert.ok(size.some((f) => f.code === CODES.RESTYLE_ARBITRARY_CLASS));

    const hex = scanSource(
      `export function App() { return <Button className="bg-[#ff0000]">Go</Button>; }\n`,
      'App.tsx',
      restyleOn,
    );
    assert.ok(hex.some((f) => f.code === CODES.RESTYLE_ARBITRARY_CLASS));

    const cn = scanSource(
      `export function App() { return <Button className={cn('w-full', 'h-[13px]')}>Go</Button>; }\n`,
      'App.tsx',
      restyleOn,
    );
    assert.ok(cn.some((f) => f.code === CODES.RESTYLE_ARBITRARY_CLASS));
  });

  it('does not flag layout utilities or data-/descendant selectors', () => {
    const findings = scanSource(
      `export function App() {
        return (
          <Button className="w-full justify-start pl-8 data-[state=open]:bg-accent [&_svg]:size-4">
            Go
          </Button>
        );
      }\n`,
      'App.tsx',
      restyleOn,
    );
    assert.equal(
      findings.filter((f) => f.code.startsWith('DECREE_RESTYLE_')).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('does not enforce restyle when the contract omits restyle', () => {
    const findings = scanSource(
      `export function App() { return <Button style={{ color: 'red' }} className="w-[32px]" sx={{ p: 1 }} />; }\n`,
      'App.tsx',
      base,
    );
    assert.equal(
      findings.filter((f) => f.code.startsWith('DECREE_RESTYLE_')).length,
      0,
    );
  });

  it('does not flag restyle on unknown components', () => {
    const findings = scanSource(
      `export function App() { return <Forged style={{ color: 'red' }} />; }\n`,
      'App.tsx',
      restyleOn,
    );
    assert.ok(findings.some((f) => f.code === CODES.UNKNOWN_COMPONENT));
    assert.equal(
      findings.filter((f) => f.code.startsWith('DECREE_RESTYLE_')).length,
      0,
    );
  });
});

describe('restyle MCP and CLI', () => {
  it('lists restyle policy on primitives', () => {
    const listed = listPrimitives(restyleOn);
    assert.deepEqual(listed.find((p) => p.name === 'Button')?.restyle, {
      style: true,
      sx: true,
      arbitraryClass: true,
    });
    const described = describeAllowedPrimitive(restyleOn, 'Button');
    assert.deepEqual(described.restyle, {
      style: true,
      sx: true,
      arbitraryClass: true,
    });
  });

  it('validateSnippet fails on style=', () => {
    const result = validateSnippet(
      restyleOn,
      `export function App() { return <Button style={{ color: 'red' }} />; }\n`,
    );
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.code === CODES.RESTYLE_STYLE));
  });

  it('decree verify exits 1 with DECREE_RESTYLE_STYLE', () => {
    const dir = mkdtempSync(join(tmpdir(), 'decree-restyle-cli-'));
    try {
      writeFileSync(
        join(dir, 'decree.contract.json'),
        `${JSON.stringify(restyleOn, null, 2)}\n`,
      );
      writeFileSync(
        join(dir, 'App.tsx'),
        `export function App() { return <Button style={{ color: 'red' }}>Go</Button>; }\n`,
      );
      const result = spawnSync(
        process.execPath,
        [decreeBin, 'verify', dir],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 1);
      assert.match(result.stderr, /DECREE_RESTYLE_STYLE/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sources scaffold includes restyle; prepare copies and --check detects drift', () => {
    const template = sourcesScaffoldTemplate();
    assert.deepEqual(template.restyle, {
      style: false,
      sx: false,
      arbitraryClass: false,
    });

    const dir = mkdtempSync(join(tmpdir(), 'decree-restyle-src-'));
    try {
      mkdirSync(join(dir, 'src', 'components', 'ui'), { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: '@acme/ui', version: '1.0.0', type: 'module' }),
      );
      writeFileSync(
        join(dir, 'src', 'components', 'ui', 'button.tsx'),
        'export function Button() { return null }\n',
      );
      writeFileSync(
        join(dir, 'decree.sources.json'),
        `${JSON.stringify(
          {
            version: 1,
            components: { include: ['src/components/ui'] },
            tokens: { mode: 'css-allowlist', cssAllowlist: [] },
            restyle: true,
          },
          null,
          2,
        )}\n`,
      );
      const built = buildContractFromPackage(dir);
      assert.deepEqual(built.contract.restyle, {
        style: true,
        sx: true,
        arbitraryClass: true,
      });
      const written = preparePackage(dir, { force: true });
      assert.equal(written.ok, true);
      const checkOk = preparePackage(dir, { check: true });
      assert.equal(checkOk.ok, true);

      const drifted = JSON.parse(
        readFileSync(join(dir, 'decree.contract.json'), 'utf8'),
      );
      drifted.restyle = { style: true, sx: false, arbitraryClass: false };
      writeFileSync(
        join(dir, 'decree.contract.json'),
        `${JSON.stringify(drifted, null, 2)}\n`,
      );
      const checkBad = preparePackage(dir, { check: true });
      assert.equal(checkBad.ok, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('shadcn Pulse demo stays clean with restyle + Button API', () => {
  it('decree verify passes the compliant shadcn app', () => {
    const result = spawnSync(
      process.execPath,
      [decreeBin, 'verify', shadcnApp],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
  });
});
