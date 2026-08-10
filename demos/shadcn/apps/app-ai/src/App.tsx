const sessionPoints = [
  { label: "Jan", value: 18000 },
  { label: "Feb", value: 16500 },
  { label: "Mar", value: 24500 },
  { label: "Apr", value: 17500 },
  { label: "May", value: 23000 },
  { label: "Jun", value: 27500 },
];

const channelBars = [
  { label: "Organic", value: 420 },
  { label: "Paid", value: 310 },
  { label: "Email", value: 230 },
  { label: "Referral", value: 165 },
  { label: "Social", value: 105 },
];

const reports = [
  { name: "Weekly acquisition", status: "Live", owner: "A. Chen", updated: "2h ago" },
  { name: "Checkout funnel", status: "Live", owner: "M. Ortiz", updated: "5h ago" },
  { name: "Segment: enterprise", status: "Draft", owner: "J. Park", updated: "Yesterday" },
  { name: "Revenue by region", status: "Live", owner: "S. Deeds", updated: "Yesterday" },
  { name: "Churn early warning", status: "Paused", owner: "R. Blake", updated: "3d ago" },
  { name: "NPS pulse", status: "Live", owner: "A. Chen", updated: "4d ago" },
] as const;

function PulseMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M1.5 10H5L7 5.5L10.5 14.5L13 7.5L15 10H18.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconOverview() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconReports() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 2.5h7.5L15.5 5.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12.5 2.5V5.5H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 9h6M7 12h6M7 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSegments() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 16c.6-2.2 2.3-3.5 4-3.5s3.4 1.3 4 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.5 12.5c.7-.3 1.5-.5 2.5-.5 1.7 0 3.4 1.3 4 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v1.5M10 16v1.5M2.5 10H4M16 10h1.5M4.7 4.7l1.1 1.1M14.2 14.2l1.1 1.1M15.3 4.7l-1.1 1.1M5.8 14.2l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5 13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3.5 5.25 7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBars() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 14.5V9M7.5 14.5V4.5M12 14.5V7M16.5 14.5V5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AreaChart() {
  const width = 520;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 28, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const yMax = 28000;
  const yTicks = [0, 7000, 14000, 21000, 28000];

  const xs = sessionPoints.map((_, i) =>
    pad.left + (i / (sessionPoints.length - 1)) * plotW,
  );
  const ys = sessionPoints.map(
    (p) => pad.top + plotH - (p.value / yMax) * plotH,
  );

  const line = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");

  const area = `${line} L ${xs[xs.length - 1].toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${xs[0].toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly sessions area chart">
      <defs>
        <linearGradient id="sessionFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => {
        const y = pad.top + plotH - (tick / yMax) * plotH;
        return (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="3 4"
            />
            <text
              x={pad.left - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#9ca3af"
              fontFamily="Inter, sans-serif"
            >
              {tick === 0 ? "0" : tick.toLocaleString()}
            </text>
          </g>
        );
      })}

      <path d={area} fill="url(#sessionFill)" />
      <path d={line} fill="none" stroke="#f97316" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

      {sessionPoints.map((p, i) => (
        <text
          key={p.label}
          x={xs[i]}
          y={height - 8}
          textAnchor="middle"
          fontSize="11"
          fill="#9ca3af"
          fontFamily="Inter, sans-serif"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function BarChart() {
  const width = 520;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 28, left: 40 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const yMax = 600;
  const yTicks = [0, 150, 300, 450, 600];
  const gap = 18;
  const barW = (plotW - gap * (channelBars.length + 1)) / channelBars.length;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Conversions by channel bar chart">
      {yTicks.map((tick) => {
        const y = pad.top + plotH - (tick / yMax) * plotH;
        return (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="3 4"
            />
            <text
              x={pad.left - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#9ca3af"
              fontFamily="Inter, sans-serif"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {channelBars.map((bar, i) => {
        const x = pad.left + gap + i * (barW + gap);
        const h = (bar.value / yMax) * plotH;
        const y = pad.top + plotH - h;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={barW} height={h} rx="3" fill="#0f766e" />
            <text
              x={x + barW / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="#9ca3af"
              fontFamily="Inter, sans-serif"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function App() {
  return (
    <div className="lookalike-root">
      <aside className="provenance-banner" role="note">
        <strong>Pulse Reports AI</strong> — rebuilt by an agent from a screenshot of
        Pulse Reports (shadcn / @demo/shadcn-ui). Not built with the design-system package.
      </aside>
      <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <PulseMark />
          </div>
          <div className="brand-text">
            <div className="brand-title">Pulse Reports</div>
            <div className="brand-subtitle">Analytics workspace</div>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          <button type="button" className="nav-item active">
            <IconOverview />
            Overview
          </button>
          <button type="button" className="nav-item">
            <IconReports />
            Reports
          </button>
          <button type="button" className="nav-item">
            <IconSegments />
            Segments
          </button>
          <button type="button" className="nav-item">
            <IconSettings />
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">v1.4 · workspace</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace &gt; <strong>Overview</strong>
          </div>
          <div className="topbar-right">
            <label className="search">
              <IconSearch />
              <input type="search" placeholder="Search reports..." />
            </label>
            <div className="avatar" aria-label="User SD">
              SD
            </div>
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <h1>Overview</h1>
            <p>
              Session health, conversion trends, and the reports your team runs every week.
            </p>
          </div>

          <section className="kpi-row" aria-label="Key metrics">
            <article className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Sessions</span>
                <span className="kpi-badge">+12.4%</span>
              </div>
              <div className="kpi-value">128,450</div>
              <div className="kpi-footer">vs prior period</div>
            </article>
            <article className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Conversion</span>
                <span className="kpi-badge">+0.4%</span>
              </div>
              <div className="kpi-value">3.82%</div>
              <div className="kpi-footer">checkout completed</div>
            </article>
            <article className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Revenue</span>
                <span className="kpi-badge">+8.1%</span>
              </div>
              <div className="kpi-value">$84.2k</div>
              <div className="kpi-footer">attributed bookings</div>
            </article>
            <article className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Active reports</span>
                <span className="kpi-badge">+3</span>
              </div>
              <div className="kpi-value">24</div>
              <div className="kpi-footer">scheduled runs</div>
            </article>
          </section>

          <section className="charts-row" aria-label="Charts">
            <article className="chart-card">
              <h2>Monthly sessions</h2>
              <p className="chart-sub">Unique sessions across all properties</p>
              <AreaChart />
            </article>
            <article className="chart-card">
              <h2>Conversions by channel</h2>
              <p className="chart-sub">Completed conversions in the selected range</p>
              <BarChart />
            </article>
          </section>

          <div className="section-toolbar">
            <div className="tabs" role="tablist">
              <button type="button" className="tab active" role="tab" aria-selected="true">
                Overview
              </button>
              <button type="button" className="tab" role="tab" aria-selected="false">
                Segments
              </button>
            </div>
            <button type="button" className="range-select">
              Last 30 days
              <IconChevron />
            </button>
          </div>

          <section className="table-card" aria-label="Recent reports">
            <div className="table-header">
              <h2>Recent reports</h2>
              <p>Last 30 days of scheduled and ad-hoc runs</p>
            </div>
            <table className="reports">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => (
                  <tr key={row.name}>
                    <td className="report-name">{row.name}</td>
                    <td>
                      <span className={`status-pill ${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.owner}</td>
                    <td>{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">Showing 6 reports in this workspace</div>
          </section>

          <section className="sync-bar" aria-label="Sync status">
            <div className="sync-left">
              <div className="sync-icon">
                <IconBars />
              </div>
              <div className="sync-copy">
                <strong>Sync healthy</strong>
                <span>
                  Warehouse sync completed 12 minutes ago. Export the current overview snapshot when ready.
                </span>
              </div>
            </div>
            <button type="button" className="export-btn">
              Export report
            </button>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}
