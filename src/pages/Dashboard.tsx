export default function Dashboard() {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Connect your revenue sources and manage attestations from here.
        </p>
      </header>
      <section className="page-card">
        <h2 className="page-card-title">Quick actions</h2>
        <ul className="page-list">
          <li>Connect Stripe, Razorpay, or Shopify (coming soon)</li>
          <li>Trigger monthly revenue report</li>
          <li>View attestation history</li>
        </ul>
      </section>
    </div>
  )
}
