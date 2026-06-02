import { useToast } from '../components/ToastContext'

const mockAttestations = [
  {
    id: '1',
    date: 'May 2026',
    revenue: '$45,230.00',
    root: '0x3f5c718534d399fbbf24fb718534d399fbbf248e21',
    status: 'Published'
  },
  {
    id: '2',
    date: 'Apr 2026',
    revenue: '$38,910.00',
    root: '0x9a2b158c417a8158ef5f4c89ad70648b351af4c8',
    status: 'Published'
  }
]

export default function Attestations() {
  const { addToast } = useToast()

  const handleCopy = (root: string) => {
    navigator.clipboard.writeText(root)
      .then(() => {
        addToast('Merkle root copied to clipboard successfully.', 'success')
      })
      .catch(() => {
        addToast('Failed to copy Merkle root to clipboard.', 'error')
      })
  }

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
