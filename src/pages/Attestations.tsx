import AttestationProgress from '../components/AttestationProgress'

export default function Attestations() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Attestations</h1>
      <p style={{ color: 'var(--muted)' }}>
        Revenue attestations published on Stellar. Merkle roots and metadata are stored on-chain.
      </p>

      <AttestationProgress />
    </div>
  )
}
