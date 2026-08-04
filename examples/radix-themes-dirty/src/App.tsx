/** Dirty Radix Themes fixture — invented controls + hex bypass. */
export function App() {
  return (
    <div style={{ background: '#111113', color: '#eee', padding: 24 }}>
      <h2 style={{ color: '#8d8dff' }}>Decree Radix Themes dirty</h2>
      <p>Looks on-brand. Off-contract.</p>
      <button
        type="button"
        style={{ background: '#3e63dd', color: '#fff', padding: '8px 16px' }}
      >
        Continue
      </button>
      <input
        placeholder="Email"
        style={{ display: 'block', marginTop: 12, border: '1px solid #555' }}
      />
    </div>
  );
}
