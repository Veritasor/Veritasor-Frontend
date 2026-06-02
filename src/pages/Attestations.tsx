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

      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '1rem' }}>On-chain Records</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--muted)', fontWeight: 600 }}>Period</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--muted)', fontWeight: 600 }}>Attested Revenue</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--muted)', fontWeight: 600 }}>Merkle Root</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--muted)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockAttestations.map((att) => (
                <tr key={att.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{att.date}</td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--accent)' }}>{att.revenue}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <code style={{ background: 'var(--surface-strong)', padding: '0.2rem 0.4rem', borderRadius: 4, fontSize: '0.85rem' }}>
                        {att.root.substring(0, 10)}...{att.root.substring(att.root.length - 8)}
                      </code>
                      <button
                        onClick={() => handleCopy(att.root)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        aria-label={`Copy Merkle root for ${att.date}`}
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', background: 'var(--success-soft)', color: 'var(--success)', padding: '0.25rem 0.5rem', borderRadius: 9999 }}>
                      {att.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
