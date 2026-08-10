export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui', minHeight: '100vh' }}>
      <div style={{ background: '#fff7e6', borderBottom: '1px solid #ffd591', padding: '8px 16px', color: '#ad6800', fontSize: 13 }}>
        AI rebuild from a screenshot — not using @demo/antd-ui / Ant Design package.
      </div>
      <div style={{ display: 'flex' }}>
        <aside style={{ width: 200, borderRight: '1px solid #f0f0f0', padding: 16 }}>
          <strong>Reports</strong>
          <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 12 }}>Ant lookalike</div>
          <button type="button" style={{ width: '100%', marginBottom: 8, padding: 8, background: '#1677ff', color: '#fff', border: 0, borderRadius: 6 }}>Overview</button>
          <button type="button" style={{ width: '100%', padding: 8, border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff' }}>Reports</button>
        </aside>
        <main style={{ padding: 24, flex: 1 }}>
          <h1>Overview</h1>
          <p style={{ color: '#8c8c8c' }}>Session health and weekly reports.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fff' }}>
              <div style={{ color: '#8c8c8c' }}>Sessions</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>128,450</div>
            </div>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fff' }}>
              <div style={{ color: '#8c8c8c' }}>Conversion</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>3.82%</div>
            </div>
          </div>
          <input placeholder="Search…" style={{ marginTop: 16, padding: 8, border: '1px solid #d9d9d9', borderRadius: 6, width: 240 }} />
          <button type="button" style={{ marginLeft: 8, padding: '8px 16px', background: '#1677ff', color: '#fff', border: 0, borderRadius: 6 }}>Run</button>
        </main>
      </div>
    </div>
  )
}
