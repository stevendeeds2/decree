import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/verify/scan.js';
import { CODES } from '../src/verify/codes.js';

const contract = {
  version: 1,
  components: ['Button'],
  tokens: [{ name: '--primary' }],
  nativeElementMap: { button: 'Button' },
};

describe('AST JSX scanning', () => {
  it('flags unknown components inside expressions (not just line-start regex)', () => {
    const source = `
export function App() {
  return cond ? <SuperButton /> : <Button>ok</Button>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', contract);
    assert.ok(
      findings.some(
        (f) =>
          f.code === CODES.UNKNOWN_COMPONENT && /SuperButton/.test(f.message),
      ),
      JSON.stringify(findings),
    );
  });

  it('does not flag component names that appear only inside string literals', () => {
    const source = `
export function App() {
  const tip = "Use <SuperButton> in docs only";
  return <Button>ok</Button>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', contract);
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });

  it('lets the contract name host packages like routers and drag-and-drop', () => {
    const source = `
import { Router, Route } from 'wouter';
import { DndContext } from '@dnd-kit/core';
export function App() {
  return <Router><Route path="/"><DndContext><Button /></DndContext></Route></Router>;
}
`;
    const strict = scanSource(source, 'src/App.tsx', contract);
    assert.equal(strict.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length, 3);
    const withHosts = { ...contract, scan: { hostPackages: ['wouter', '@dnd-kit/'] } };
    assert.deepEqual(scanSource(source, 'src/App.tsx', withHosts), []);
  });

  it('treats context providers and consumers as plumbing, not components', () => {
    const source = `
import { ThemeContext } from '@acme/ds/context';
export function App() {
  return <ThemeContext.Provider value={x}><ThemeContext.Consumer>{() => <Button />}</ThemeContext.Consumer></ThemeContext.Provider>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', contract);
    assert.deepEqual(findings, []);
  });

  it('flags native elements from the AST', () => {
    const source = `
export function App() {
  return <div><button type="button">x</button></div>;
}
`;
    const findings = scanSource(source, 'src/App.tsx', contract);
    assert.ok(
      findings.some((f) => f.code === CODES.NATIVE_ELEMENT),
      JSON.stringify(findings),
    );
  });

  it('still allows host imports from next/link', () => {
    const source = `
import Link from 'next/link';
export function App() { return <Link href="/">go</Link>; }
`;
    const findings = scanSource(source, 'src/App.tsx', {
      version: 1,
      components: ['Button'],
      tokens: [],
      nativeElementMap: {},
    });
    assert.equal(
      findings.filter((f) => f.code === CODES.UNKNOWN_COMPONENT).length,
      0,
      JSON.stringify(findings),
    );
  });
});
