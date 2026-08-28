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

  it('compiles a schema-faithful Specs 2 export (specsplugin.com/schema)', () => {
    const dir = tmpDir('decree-specs-schema-');
    try {
      // Every prop kind and section from the published schema: EnumProp,
      // BooleanProp, StringProp, NumberProp, SlotProp, ImageProp,
      // $extensions, nullable, default/variants deltas, subcomponents,
      // invalidVariantCombinations, metadata.
      write(
        dir,
        'ds-button.yaml',
        `components:
  dsButton:
    title: DS Button
    anatomy:
      root: { type: frame }
      label: { type: text }
      glyph: { type: instance, slot: true }
    props:
      appearance:
        type: string
        default: critical
        enum: [critical, warning, success, info]
        $extensions:
          com.figma:
            type: VARIANT
      disabled:
        type: boolean
        default: false
        $extensions:
          com.figma:
            type: BOOLEAN
      label:
        type: string
        nullable: false
        examples: ["Pay now", "Hold"]
      headingLevel:
        type: number
        default: 2
        nullable: false
      icon:
        type: slot
        minChildren: 0
        maxChildren: 1
        anyOf: [DsIcon]
      source:
        type: image
        default: null
    default:
      layout:
        - root:
            - glyph
            - label
      elements:
        root:
          styles:
            fills: "{ds.color.background.filled}"
            cornerRadius: "{ds.shape.border-radius.pill}"
            paddingLeft: { value: 12, type: ABSOLUTE }
    variants:
      - configuration:
          appearance: success
        elements:
          root:
            styles:
              fills: "{ds.color.background.success}"
      - configuration:
          disabled: true
          appearance: warning
        invalid: true
    invalidVariantCombinations:
      - disabled: true
        appearance: warning
    subcomponents:
      dsButtonGlyph:
        title: DS Button Glyph
        anatomy:
          root: { type: frame }
    metadata:
      generator: specs-cli
      config:
        include:
          invalidCombinations: true
`,
      );
      const contract = buildContractFromSpecs(dir, { name: '@acme/ds' });
      validateContract(contract);
      // Subcomponents are not promoted to the allowlist.
      assert.deepEqual(contract.components, ['DSButton']);
      assert.deepEqual(contract.componentApis.DSButton.props, {
        appearance: {
          enum: ['critical', 'warning', 'success', 'info'],
          type: 'string',
        },
        disabled: { type: 'boolean' },
        label: { type: 'string' },
        headingLevel: { type: 'number' },
      });
      assert.deepEqual(contract.componentApis.DSButton.forbiddenCombinations, [
        { disabled: true, appearance: 'warning' },
      ]);
      // Anatomy, variants, styles, and extensions never leak.
      const raw = JSON.stringify(contract);
      assert.ok(!raw.includes('anatomy'));
      assert.ok(!raw.includes('$extensions'));
      assert.ok(!raw.includes('ds.color.background'));
      assert.ok(!raw.includes('DSButtonGlyph'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts the CLI overview shape: type variant with values', () => {
    const dir = tmpDir('decree-specs-values-');
    try {
      write(
        dir,
        'button.yaml',
        `components:
  dsButton:
    title: DS Button
    props:
      size:
        type: variant
        values: [small, medium, large]
      variant:
        type: variant
        values: [primary, secondary]
`,
      );
      const contract = buildContractFromSpecs(dir, { name: '@acme/ds' });
      validateContract(contract);
      assert.deepEqual(contract.componentApis.DSButton.props.size, {
        enum: ['small', 'medium', 'large'],
        type: 'string',
      });
      assert.deepEqual(contract.componentApis.DSButton.props.variant, {
        enum: ['primary', 'secondary'],
        type: 'string',
      });
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

  it('merges both adapter flags into one contract (Specs wins APIs, DS wins semantics)', () => {
    const specsDir = tmpDir('decree-cli-pair-specs-');
    const dsDir = tmpDir('decree-cli-pair-ds-');
    const outDir = tmpDir('decree-cli-pair-out-');
    try {
      write(
        specsDir,
        'Button.yaml',
        `title: Button
props:
  variant:
    type: string
    enum: [primary, secondary]
invalidVariantCombinations:
  - variant: secondary
`,
      );
      write(
        dsDir,
        'contracts/button.contract.json',
        JSON.stringify({
          id: 'ds.button',
          name: 'Button',
          semantics: { element: 'button' },
          props: [{ name: 'variant', type: { enum: ['primary'] } }],
        }),
      );
      write(
        dsDir,
        'contracts/input.contract.json',
        JSON.stringify({
          id: 'ds.input',
          name: 'Input',
          semantics: { element: 'input' },
          props: [{ name: 'size', type: { enum: ['sm', 'md'] } }],
        }),
      );
      const outPath = join(outDir, 'decree.contract.json');
      const result = spawnSync(
        process.execPath,
        [
          decreeBin,
          'prepare',
          '--from-specs',
          specsDir,
          '--from-ds-contracts',
          dsDir,
          '--name',
          '@demo/pair-ui',
          '--out',
          outPath,
        ],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /2 component APIs/);
      const contract = JSON.parse(readFileSync(outPath, 'utf8'));
      validateContract(contract);
      assert.deepEqual(contract.components, ['Button', 'Input']);
      // Specs is the record for a shared component's API.
      assert.deepEqual(contract.componentApis.Button.props.variant.enum, [
        'primary',
        'secondary',
      ]);
      assert.equal(
        contract.componentApis.Button.forbiddenCombinations.length,
        1,
      );
      assert.deepEqual(contract.componentApis.Input.props.size.enum, [
        'sm',
        'md',
      ]);
      // DS Contracts is the record for native element semantics.
      assert.equal(contract.nativeElementMap.button, 'Button');
      assert.equal(contract.nativeElementMap.input, 'Input');
      // Merge never turns on restyle by itself.
      assert.equal(contract.restyle, undefined);

      const check = spawnSync(
        process.execPath,
        [
          decreeBin,
          'prepare',
          '--from-specs',
          specsDir,
          '--from-ds-contracts',
          dsDir,
          '--name',
          '@demo/pair-ui',
          '--out',
          outPath,
          '--check',
        ],
        { encoding: 'utf8' },
      );
      assert.equal(check.status, 0, check.stderr + check.stdout);

      // --restyle sets team policy on the merged contract; --check agrees.
      const restyled = spawnSync(
        process.execPath,
        [
          decreeBin,
          'prepare',
          '--from-specs',
          specsDir,
          '--from-ds-contracts',
          dsDir,
          '--name',
          '@demo/pair-ui',
          '--restyle',
          '--out',
          outPath,
        ],
        { encoding: 'utf8' },
      );
      assert.equal(restyled.status, 0, restyled.stderr);
      const restyledContract = JSON.parse(readFileSync(outPath, 'utf8'));
      validateContract(restyledContract);
      assert.equal(restyledContract.restyle, true);
      const restyledCheck = spawnSync(
        process.execPath,
        [
          decreeBin,
          'prepare',
          '--from-specs',
          specsDir,
          '--from-ds-contracts',
          dsDir,
          '--name',
          '@demo/pair-ui',
          '--restyle',
          '--out',
          outPath,
          '--check',
        ],
        { encoding: 'utf8' },
      );
      assert.equal(
        restyledCheck.status,
        0,
        restyledCheck.stderr + restyledCheck.stdout,
      );
    } finally {
      rmSync(specsDir, { recursive: true, force: true });
      rmSync(dsDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('refuses --restyle on source-based prepare', () => {
    const result = spawnSync(
      process.execPath,
      [decreeBin, 'prepare', '.', '--restyle'],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /decree\.sources\.json/);
  });
});

describe('adapter compile notes', () => {
  it('DS compile reports every leave-behind instead of dropping silently', () => {
    const dir = tmpDir('decree-ds-notes-');
    try {
      // Right content, wrong filename — ignored, but named in the notes.
      write(
        dir,
        'button.json',
        JSON.stringify({
          id: 'ds.button',
          name: 'Button',
          props: [{ name: 'variant', type: { enum: ['primary'] } }],
        }),
      );
      write(
        dir,
        'card.contract.json',
        JSON.stringify({
          id: 'ds.card',
          name: 'Card',
          props: [
            { name: 'elevation', type: { options: ['low', 'high'] } },
            { type: { enum: ['x'] } },
            { name: 'size', type: { enum: ['sm', 'md'] } },
            { name: 'icon', type: 'slot' },
          ],
        }),
      );
      write(
        dir,
        'everything.contract.json',
        JSON.stringify([{ name: 'Chip' }, { name: 'Tag' }]),
      );
      const result = prepareFromExternal('ds-contracts', dir, {
        outPath: join(dir, 'decree.contract.json'),
      });
      assert.equal(result.ok, true);
      validateContract(result.contract);
      // Compiles what it can: Card with the readable prop.
      assert.deepEqual(result.contract.components, ['Card']);
      assert.deepEqual(result.contract.componentApis.Card.props.size.enum, [
        'sm',
        'md',
      ]);
      const notes = result.notes.join('\n');
      assert.match(notes, /Card: prop "elevation" left behind \(unsupported shape/);
      assert.match(notes, /Card: prop without a name/);
      assert.match(notes, /everything\.contract\.json: not a single contract object/);
      assert.match(notes, /1 document file\(s\) ignored \(not named \*\.contract\.json\): button\.json/);
      // Slot props are by-design leave-behinds — never noted.
      assert.doesNotMatch(notes, /icon/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('DS zero-match error names the files that missed the convention', () => {
    const dir = tmpDir('decree-ds-miss-');
    try {
      write(
        dir,
        'button.json',
        JSON.stringify({ name: 'Button', props: [] }),
      );
      assert.throws(
        () => buildContractFromDsContracts(dir),
        /do not match the naming convention: button\.json — rename to \*\.contract\.json/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Specs compile notes unsupported props and dropped combos, not slots', () => {
    const dir = tmpDir('decree-specs-notes-');
    try {
      write(
        dir,
        'Button.yaml',
        `title: Button
props:
  variant:
    type: string
    enum: [primary, secondary]
  emphasis: "low | high"
  icon:
    type: slot
invalidVariantCombinations:
  - tone: dark
`,
      );
      const result = prepareFromExternal('specs', dir, {
        outPath: join(dir, 'decree.contract.json'),
      });
      assert.equal(result.ok, true);
      const notes = result.notes.join('\n');
      assert.match(notes, /Button: prop "emphasis" left behind \(unsupported shape/);
      assert.match(notes, /Button: invalidVariantCombinations entry references only unmapped props/);
      assert.doesNotMatch(notes, /icon/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CLI prints compile notes on stderr and still exits 0', () => {
    const dir = tmpDir('decree-cli-notes-');
    try {
      write(
        dir,
        'card.contract.json',
        JSON.stringify({
          id: 'ds.card',
          name: 'Card',
          props: [
            { name: 'elevation', type: { options: ['low', 'high'] } },
            { name: 'size', type: { enum: ['sm', 'md'] } },
          ],
        }),
      );
      const result = spawnSync(
        process.execPath,
        [decreeBin, 'prepare', '--from-ds-contracts', dir],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(
        result.stderr,
        /decree prepare: left behind — Card: prop "elevation" left behind/,
      );
      assert.match(result.stdout, /1 component APIs/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a clean compile produces zero notes', () => {
    const specsDir = join(root, 'demos/together/specs');
    const dsDir = join(root, 'demos/together/ds-contracts');
    const outDir = tmpDir('decree-clean-notes-');
    try {
      const specs = prepareFromExternal('specs', specsDir, {
        outPath: join(outDir, 'specs.contract.json'),
      });
      const ds = prepareFromExternal('ds-contracts', dsDir, {
        outPath: join(outDir, 'ds.contract.json'),
      });
      assert.deepEqual(specs.notes, []);
      assert.deepEqual(ds.notes, []);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
