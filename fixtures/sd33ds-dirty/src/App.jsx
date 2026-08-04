import { html } from 'htm/preact';

/** Dirty dogfood — looks on-brand; invents button + hex instead of SD33DS. */
export function App() {
  return html`
    <main style=${{ padding: '17px', background: '#0f172a', color: '#f8fafc' }}>
      <h1 style=${{ color: '#38bdf8' }}>Project board</h1>
      <p>AI lookalike — not Decree-compliant.</p>
      <button
        type="button"
        style=${{ background: '#f97316', color: '#fff', padding: '12px 16px' }}
      >
        Open issue
      </button>
    </main>
  `;
}
