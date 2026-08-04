import { html } from 'htm/preact';
import { Button } from '@stevendeeds/sd33ds/js/components/Button.js';
import { SectionHeader } from '@stevendeeds/sd33ds/js/components/SectionHeader.js';

/** Clean dogfood — consumer app uses SD33DS primitives + theme CSS variables only. */
export function App() {
  return html`
    <main
      style=${{
        color: 'var(--light-typography-color-primary)',
        fontSize: 'var(--light-typography-body-font-size)',
      }}
    >
      <${SectionHeader}>Project board<//>
      <p style=${{ color: 'var(--light-typography-color-secondary)' }}>
        Built from the real SD33DS parts.
      </p>
      <${Button} variant="emphasis">Open issue<//>
      <${Button} variant="passive">Dismiss<//>
    </main>
  `;
}
