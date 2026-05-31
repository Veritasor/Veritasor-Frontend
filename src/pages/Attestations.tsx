export default function Attestations() {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Attestations</h1>
        <p className="page-description">
          Revenue attestations published on Stellar. Merkle roots and metadata are stored on-chain.
        </p>
      </header>
      <section className="page-card">
        <p className="empty-state">
          No attestations yet. Run a revenue report from the dashboard to create one.
        </p>
      </section>
    </div>
  )
}
