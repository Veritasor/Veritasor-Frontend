export default function Attestations() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Attestations</h1>
      <p style={{ color: 'var(--muted)' }}>
        Revenue attestations published on Stellar. Merkle roots and metadata are stored on-chain.
      </p>
        <section className="card" role="region" aria-labelledby="attestations-card-header">
          <h2 id="attestations-card-header" className="card-header" style={{ marginTop: 0, fontSize: '1rem' }}>Attestation Info</h2>
          <p className="card-body" style={{ color: 'var(--muted)', margin: 0 }}>No attestations yet. Run a revenue report from the dashboard to create one.</p>
      </section>
    </div>
  )
}
