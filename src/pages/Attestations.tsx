export default function Attestations() {
  return (
    <section className="app-page">
      <header className="page-header">
        <p className="page-eyebrow">On-chain evidence</p>
        <h1 className="page-title">Attestations</h1>
        <p className="page-description">
          Revenue attestations published on Stellar. Merkle roots and metadata are stored
          on-chain for downstream verification.
        </p>
      </header>

      <section className="app-card dashboard-card">
        <p className="dashboard-meta">
          No attestations yet. Run a revenue report from the dashboard after connecting a
          source to generate the first record.
        </p>
      </section>
    </section>
  )
}
