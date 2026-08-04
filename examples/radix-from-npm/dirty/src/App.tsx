/** Contaminated consumer UI — should fail decree verify. */
export function App() {
  return (
    <div style={{ background: 'rgb(17, 17, 19)', padding: 24 }}>
      <h2 style={{ color: '#8d8dff' }}>Radix Themes from npm (dirty)</h2>
      <InventedChip />
      <button type="button" style={{ background: 'hsl(226, 70%, 55%)' }}>
        Continue
      </button>
    </div>
  );
}

function InventedChip() {
  return <span style={{ color: '#fff' }}>chip</span>;
}
