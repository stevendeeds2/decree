export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: '#fff3cd',
          borderBottom: '1px solid #ffc107',
          padding: '8px 16px',
          fontSize: 13,
          color: '#856404',
        }}
      >
        AI rebuild from a screenshot — not using @demo/mui-ui / Material design-system package.
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <aside
          style={{
            width: 220,
            background: '#ffffff',
            borderRight: '1px solid #e0e0e0',
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Reports</div>
          <div style={{ fontSize: 12, color: '#757575', marginBottom: 16 }}>
            Material lookalike
          </div>
          <button type="button" style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8, background: '#1976d2', color: '#fff', border: 0, borderRadius: 4 }}>
            Overview
          </button>
          <button type="button" style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8, background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 4 }}>
            Reports
          </button>
          <button type="button" style={{ display: 'block', width: '100%', padding: 8, background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 4 }}>
            Settings
          </button>
        </aside>
        <main style={{ flex: 1, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Overview</h1>
          <p style={{ color: '#757575' }}>Session health and weekly reports.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
              <div style={{ color: '#757575', fontSize: 13 }}>Sessions</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>128,450</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
              <div style={{ color: '#757575', fontSize: 13 }}>Conversion</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>3.82%</div>
            </div>
          </div>
          <input
            placeholder="Search reports…"
            style={{ padding: 8, border: '1px solid #e0e0e0', borderRadius: 4, width: 240, marginBottom: 16 }}
          />
          <button type="button" style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 0, borderRadius: 4 }}>
            Run report
          </button>
        </main>
      </div>
    </div>
  )
}
