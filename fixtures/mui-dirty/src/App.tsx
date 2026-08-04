/** Dirty MUI fixture — skips the system for a hand-rolled lookalike. */
export function App() {
  return (
    <div style={{ background: '#121212', color: '#eeeeee', padding: 24 }}>
      <h2 style={{ color: '#90caf9' }}>Decree MUI dirty</h2>
      <p>Looks fine. Off-contract.</p>
      <button
        type="button"
        style={{ background: '#1976d2', color: '#fff', padding: '8px 16px' }}
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
