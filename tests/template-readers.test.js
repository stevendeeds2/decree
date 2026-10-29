import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/verify/scan.js';
import { CODES } from '../src/verify/codes.js';

/** @param {{ code: string }[]} findings @param {string} code */
const only = (findings, code) => findings.filter((f) => f.code === code);

const vueContract = {
  version: 1,
  components: ['DsButton', 'DsCard'],
  tokens: [{ name: '--ds-color-primary' }],
  nativeElementMap: { button: 'DsButton' },
  componentApis: {
    DsButton: { props: { variant: { enum: ['primary', 'secondary'] }, size: { enum: ['sm', 'lg'] } } },
  },
  restyle: { style: true, sx: false, arbitraryClass: false },
};

describe('Vue single-file components', () => {
  it('passes allowlisted components in PascalCase and kebab-case', () => {
    const source = `<script setup>
import { DsButton, DsCard } from '@acme/ds';
</script>
<template>
  <DsCard>
    <DsButton variant="primary" :size="'lg'" @click="save" class="wide">Save</DsButton>
    <ds-button variant="secondary">Cancel</ds-button>
  </DsCard>
</template>
<style scoped>
.wide { color: var(--ds-color-primary); }
</style>`;
    assert.deepEqual(scanSource(source, 'src/Panel.vue', vueContract), []);
  });

  it('flags an invented component, a bad value, a raw button, and restyle', () => {
    const source = `<template>
  <div>
    <MagicButton />
    <DsButton variant="ghost">x</DsButton>
    <button>raw</button>
    <DsCard style="padding: 3px" />
  </div>
</template>`;
    const findings = scanSource(source, 'src/Bad.vue', vueContract);
    assert.equal(only(findings, CODES.UNKNOWN_COMPONENT)[0]?.line, 3, JSON.stringify(findings));
    assert.equal(only(findings, CODES.INVALID_PROP_VALUE)[0]?.line, 4);
    assert.equal(only(findings, CODES.NATIVE_ELEMENT)[0]?.line, 5);
    assert.equal(only(findings, CODES.RESTYLE_STYLE)[0]?.line, 6);
  });

  it('checks colors and tokens in style blocks', () => {
    const source = `<template><DsCard /></template>
<style>
.a { color: #123456; background: var(--made-up); }
</style>`;
    const findings = scanSource(source, 'src/Style.vue', vueContract);
    assert.equal(only(findings, CODES.HARDCODED_HEX).length, 1);
    assert.equal(only(findings, CODES.UNKNOWN_TOKEN).length, 1);
  });
});

const svelteContract = {
  version: 1,
  components: ['Button', 'Card'],
  tokens: [],
  nativeElementMap: { button: 'Button' },
  componentApis: { Button: { props: { variant: { enum: ['primary', 'secondary'] } } } },
};

describe('Svelte components', () => {
  it('passes allowlisted components with legal props and events', () => {
    const source = `<script>
  import { Button, Card } from '@acme/ds';
  let busy = false;
</script>

<Card>
  <Button variant="primary" onclick={() => (busy = true)} {...$$restProps}>Go</Button>
  <Button variant={"secondary"} on:click={stop}>Stop</Button>
</Card>`;
    assert.deepEqual(scanSource(source, 'src/Panel.svelte', svelteContract), []);
  });

  it('flags an invented component and an illegal value with lines', () => {
    const source = `<script>
  import { Button } from '@acme/ds';
</script>
<MagicButton />
<Button variant="ghost">x</Button>
<button>raw</button>`;
    const findings = scanSource(source, 'src/Bad.svelte', svelteContract);
    assert.equal(only(findings, CODES.UNKNOWN_COMPONENT)[0]?.line, 4, JSON.stringify(findings));
    assert.equal(only(findings, CODES.INVALID_PROP_VALUE)[0]?.line, 5);
    assert.equal(only(findings, CODES.NATIVE_ELEMENT)[0]?.line, 6);
  });
});

const angularContract = {
  version: 1,
  components: ['app-button', 'app-card'],
  tokens: [],
  nativeElementMap: { button: 'app-button' },
  componentApis: { 'app-button': { props: { variant: { enum: ['primary', 'secondary'] }, size: {} } } },
  restyle: { style: true, sx: false, arbitraryClass: false },
};

describe('Angular component templates', () => {
  it('passes allowlisted elements with inputs, outputs, and control flow', () => {
    const source = `<app-card>
  @if (ready) {
    <app-button variant="primary" [size]="size" (click)="save()">Save</app-button>
  }
  <ng-container *ngFor="let x of xs"><app-button variant="secondary">{{ x }}</app-button></ng-container>
</app-card>`;
    assert.deepEqual(scanSource(source, 'src/app/panel.component.html', angularContract), []);
  });

  it('flags invented elements, bad values, raw buttons, and style bindings', () => {
    const source = `<div>
  <app-magic></app-magic>
  <app-button variant="ghost"></app-button>
  <button type="button">raw</button>
  <app-card [style.padding.px]="3"></app-card>
  <mat-card></mat-card>
</div>`;
    const findings = scanSource(source, 'src/app/bad.component.html', angularContract);
    assert.equal(only(findings, CODES.UNKNOWN_COMPONENT).length, 1, JSON.stringify(findings));
    assert.equal(only(findings, CODES.UNKNOWN_COMPONENT)[0].line, 2);
    assert.equal(only(findings, CODES.INVALID_PROP_VALUE)[0]?.line, 3);
    assert.equal(only(findings, CODES.NATIVE_ELEMENT)[0]?.line, 4);
    assert.equal(only(findings, CODES.RESTYLE_STYLE)[0]?.line, 5);
  });

  it('leaves ordinary .html files alone', () => {
    assert.deepEqual(scanSource('<app-magic></app-magic>', 'public/index.html', angularContract), []);
  });
});
