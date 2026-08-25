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
import {
  buildContractFromDsContracts,
  buildContractFromSpecs,
  prepareFromExternal,
} from '../src/init/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const decreeBin = join(root, 'bin/decree.js');

function tmpDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function write(dir, rel, contents) {
  const path = join(dir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  return path;
}

describe('Specs adapter', () => {
  it('compiles names, enums, invalid combos, tokens, and deprecations', () => {
    const dir = tmpDir('decree-specs-');
    try {
      write(
        dir,
        'package.json',
        JSON.stringify({ name: '@acme/specs-kit', version: '1.0.0' }),
      );
      write(
        dir,
        'specs.yaml',
        `components:
  Button:
    title: Button
    props:
      variant:
        type: string
        enum: [primary, secondary]
      size:
        type: string
        enum: [sm, md, lg]
      disabled:
        type: boolean
        default: false
      label:
        type: string
      icon:
        type: slot
      className:
        type: string
    invalidVariantCombinations:
      - variant: secondary
        size: lg
    anatomy:
      root: { type: frame }
      label: { type: text }
    default:
      layout: []
      elements:
        root:
          styles:
            color: '{color.action.primary}'
  Ghost:
    title: Ghost
    deprecated: true
    replacement: Button
    props:
      tone:
        type: string
        enum: [quiet]
tokens:
  color:
    action:
      primary:
        $value: '#111'
`,
      );
      const contract = buildContractFromSpecs(dir);
      validateContract(contract);
      assert.equal(contract.name, '@acme/specs-kit');
      assert.deepEqual(contract.components, ['Button', 'Ghost']);
      assert.deepEqual(contract.componentApis.Button, {
        props: {
          variant: { enum: ['primary', 'secondary'], type: 'string' },
          size: { enum: ['sm', 'md', 'lg'], type: 'string' },
          disabled: { type: 'boolean' },
          label: { type: 'string' },
        },
        forbiddenCombinations: [{ variant: 'secondary', size: 'lg' }],
      });
      assert.equal(contract.componentApis.Button.props.icon, undefined);
      assert.equal(contract.componentApis.Button.props.className, undefined);
      assert.ok(!JSON.stringify(contract).includes('anatomy'));
      assert.ok(!JSON.stringify(contract).includes('color.action.primary'));
      assert.ok(contract.tokens.some((t) => t.name === '--color-action-primary'));
      assert.deepEqual(contract.deprecations.components.Ghost, {
        reason: 'Deprecated in Specs',
        replacement: 'Button',
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads a directory of api.yaml files without catalog wrapper', () => {
    const dir = tmpDir('decree-specs-dir-');
    try {
      write(
        dir,
        'Button/api.yaml',
        `title: Button
props:
  variant:
    type: string
    enum: [primary, ghost]
`,
      );
      write(
        dir,
        'Input/api.json',
        JSON.stringify({
          title: 'Input',
          props: { size: { type: 'string', enum: ['sm', 'md'] } },
        }),
      );
      const contract = buildContractFromSpecs(dir);
      validateContract(contract);
      assert.deepEqual(contract.components, ['Button', 'Input']);
      assert.deepEqual(contract.componentApis.Button.props.variant.enum, [
        'primary',
        'ghost',
      ]);
      assert.deepEqual(contract.componentApis.Input.props.size.enum, ['sm', 'md']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when the tree has no components', () => {
    const dir = tmpDir('decree-specs-empty-');
    try {
      write(dir, 'readme.txt', 'no specs here');
      assert.throws(() => buildContractFromSpecs(dir), /No Specs components/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('DS Contracts adapter', () => {
  it('compiles name, enum props, tokens, deprecation, and native map', () => {
    const dir = tmpDir('decree-ds-');
    try {
      write(
        dir,
        'package.json',
        JSON.stringify({ name: '@acme/ds-contracts', version: '1.0.0' }),
      );
      write(
        dir,
        'contracts/button.contract.json',
        JSON.stringify({
          id: 'ds.button',
          name: 'Button',
          status: 'stable',
          semantics: { element: 'button' },
          props: [
            {
              name: 'variant',
              type: { enum: ['primary', 'secondary'] },
              default: 'primary',
              bindings: { code: { prop: 'variant' } },
            },
            { name: 'disabled', type: 'boolean' },
            { name: 'title', type: 'text' },
            {
              name: 'items',
              type: { arrayOf: { label: 'text' } },
            },
            {
              name: 'onPress',
              type: 'boolean',
              bindings: { code: { prop: 'onClick' } },
            },
          ],
          anatomy: {
            root: {
              tokens: { 'background-color': '{color.action.primary}' },
              layout: { display: 'flex' },
            },
          },
        }),
      );
      write(
        dir,
        'contracts/banner.contract.json',
        JSON.stringify({
          id: 'ds.banner',
          name: 'Banner',
          status: 'deprecated',
          description: 'Use Button instead',
          replacement: 'Button',
          props: [
            { name: 'status', type: { enum: ['info', 'warning'] } },
          ],
        }),
      );
      write(
        dir,
        'tokens/color.tokens.json',
        JSON.stringify({
          color: {
            action: {
              primary: { $value: '#111' },
            },
          },
        }),
      );
      const contract = buildContractFromDsContracts(dir);
      validateContract(contract);
      assert.deepEqual(contract.components, ['Banner', 'Button']);
      assert.deepEqual(contract.componentApis.Button.props, {
        variant: { enum: ['primary', 'secondary'], type: 'string' },
        disabled: { type: 'boolean' },
      });
      assert.equal(contract.componentApis.Button.props.title, undefined);
      assert.equal(contract.componentApis.Button.props.items, undefined);
      assert.equal(contract.componentApis.Button.props.onClick, undefined);
      assert.ok(!JSON.stringify(contract).includes('anatomy'));
      assert.ok(contract.tokens.some((t) => t.name === '--color-action-primary'));
      assert.deepEqual(contract.deprecations.components.Banner, {
        reason: 'Use Button instead',
        replacement: 'Button',
      });
      assert.equal(contract.nativeElementMap.button, 'Button');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when no *.contract.json files exist', () => {
    const dir = tmpDir('decree-ds-empty-');
    try {
      write(dir, 'notes.json', JSON.stringify({ hello: true }));
      assert.throws(
        () => buildContractFromDsContracts(dir),
        /No DS Contracts/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('adapter prepare CLI', () => {
  it('decree prepare --from-specs writes APIs and --check detects drift', () => {
    const dir = tmpDir('decree-specs-cli-');
    try {
      write(
        dir,
        'Button.yaml',
        `title: Button
props:
  variant:
    type: string
    enum: [primary]
`,
      );
      const written = prepareFromExternal('specs', dir, { force: true });
      assert.equal(written.ok, true);
      const onDisk = JSON.parse(
        readFileSync(join(dir, 'decree.contract.json'), 'utf8'),
      );
      validateContract(onDisk);
      assert.deepEqual(onDisk.componentApis.Button.props.variant.enum, [
        'primary',
      ]);
      const checkOk = prepareFromExternal('specs', dir, { check: true });
      assert.equal(checkOk.ok, true);
      onDisk.componentApis.Button.props.variant.enum = ['ghost'];
      writeFileSync(
        join(dir, 'decree.contract.json'),
        `${JSON.stringify(onDisk, null, 2)}\n`,
      );
      const checkBad = prepareFromExternal('specs', dir, { check: true });
      assert.equal(checkBad.ok, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CLI --from-specs and --from-ds-contracts exit 0 with APIs', () => {
    const specsDir = tmpDir('decree-cli-specs-');
    const dsDir = tmpDir('decree-cli-ds-');
    try {
      write(
        specsDir,
        'Button.yaml',
        `title: Button
props:
  variant:
    type: string
    enum: [primary, secondary]
`,
      );
      const specs = spawnSync(
        process.execPath,
        [decreeBin, 'prepare', '--from-specs', specsDir],
        { encoding: 'utf8' },
      );
      assert.equal(specs.status, 0, specs.stderr);
      assert.match(specs.stdout, /1 component APIs/);
      const specsContract = JSON.parse(
        readFileSync(join(specsDir, 'decree.contract.json'), 'utf8'),
      );
      assert.deepEqual(specsContract.componentApis.Button.props.variant.enum, [
        'primary',
        'secondary',
      ]);

      write(
        dsDir,
        'contracts/input.contract.json',
        JSON.stringify({
          id: 'ds.input',
          name: 'Input',
          props: [{ name: 'size', type: { enum: ['sm', 'md'] } }],
        }),
      );
      const ds = spawnSync(
        process.execPath,
        [decreeBin, 'prepare', '--from-ds-contracts', dsDir],
        { encoding: 'utf8' },
      );
      assert.equal(ds.status, 0, ds.stderr);
      assert.match(ds.stdout, /1 component APIs/);
      const dsContract = JSON.parse(
        readFileSync(join(dsDir, 'decree.contract.json'), 'utf8'),
      );
      assert.deepEqual(dsContract.componentApis.Input.props.size.enum, [
        'sm',
        'md',
      ]);
    } finally {
      rmSync(specsDir, { recursive: true, force: true });
      rmSync(dsDir, { recursive: true, force: true });
    }
  });

  it('refuses both adapter flags', () => {
    const result = spawnSync(
      process.execPath,
      [
        decreeBin,
        'prepare',
        '--from-specs',
        '.',
        '--from-ds-contracts',
        '.',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /only one of/);
  });
});
