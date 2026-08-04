/** Contaminated consumer UI — should fail decree verify. */
export function App() {
  return (
    <div style={{ background: 'rgb(18, 18, 18)', color: '#eee', padding: 24 }}>
      <h2 style={{ color: 'hsl(207, 90%, 54%)' }}>MUI from npm (dirty)</h2>
      <SuperButtonLookalike />
      <button type="button" style={{ background: '#1976d2' }}>
        Continue
      </button>
    </div>
  );
}

function SuperButtonLookalike() {
  return <span style={{ color: '#90caf9' }}>lookalike</span>;
}
