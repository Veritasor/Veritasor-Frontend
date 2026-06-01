export default function Dashboard() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connect your revenue sources and manage attestations from here.
      </p>
      <section className="card" role="region" aria-labelledby="dashboard-card-header">
        <h2 id="dashboard-card-header" className="card-header" style={{ marginTop: 0, fontSize: '1rem' }}>Quick actions</h2>
        <ul className="card-body" style={{ color: 'var(--muted)' }}>
          <li>Connect Stripe, Razorpay, or Shopify (coming soon)</li>
          <li>Trigger monthly revenue report</li>
          <li>View attestation history</li>
        </ul>
      </section>
    </div>
  )
}
