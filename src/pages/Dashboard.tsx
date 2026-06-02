import { Link } from 'react-router-dom'

export default function Dashboard() {
  // Simulated loading state - in production, this would be driven by data fetching
  const [isLoading] = useState(false)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <section className="app-page">
      <header className="page-header">
        <p className="page-eyebrow">Revenue integrity</p>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Connect your revenue sources, manage permissions, and prepare every attestation run
          from one place.
        </p>
      </header>

      <section className="dashboard-hero app-card">
        <div>
          <p className="dashboard-kicker">New flow</p>
          <h2>Connect a source with clearer milestones and safer defaults</h2>
          <p>
            The new four-step wizard adds a progress header, step-level validation, and
            readable permission summaries before anyone grants access.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <Link to="/connect-source/provider" className="app-button app-button-primary">
            Open connect source wizard
          </Link>
          <p className="dashboard-meta">Works for Stripe, Shopify, and Razorpay connection flows.</p>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="app-card dashboard-card">
          <h2>Connection empty state</h2>
          <p>
            No revenue sources are connected yet. Start with a provider that owns the primary
            payout stream so attestations can inherit the cleanest baseline data.
          </p>
        </section>

        <section className="app-card dashboard-card">
          <h2>Review checklist</h2>
          <ul className="dashboard-list">
            <li>Provider selected before authorization language appears</li>
            <li>Next stays disabled until authorization returns successfully</li>
            <li>Scope errors surface inline without relying on color alone</li>
            <li>Final confirmation restates read-only access before completion</li>
          </ul>
        </section>
      </div>
    </section>
  )
}
