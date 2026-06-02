import { Link } from 'react-router-dom'

const ATTESTATIONS = [
  { id: 'att-001', timestamp: '2026-05-28T14:32:00Z', recordCount: 142, status: 'verified' as const },
  { id: 'att-002', timestamp: '2026-05-15T09:10:00Z', recordCount: 98, status: 'pending' as const },
]

const STATUS_COLORS = {
  verified: { bg: 'var(--success-soft)', color: 'var(--success)' },
  pending: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  failed: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
}

export default function Attestations() {
  // Simulated loading state - in production, this would be driven by data fetching
  const [isLoading] = useState(false)

  if (isLoading) {
    return <AttestationsSkeleton />
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Attestations</h1>
      <p style={{ color: 'var(--muted)' }}>
        Revenue attestations published on Stellar. Merkle roots and metadata are stored on-chain.
      </p>

      {ATTESTATIONS.length === 0 ? (
        <section
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--surface)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            No attestations yet. Run a revenue report from the dashboard to create one.
          </p>
        </section>
      ) : (
        <ul
          aria-label="Attestations list"
          style={{ listStyle: 'none', margin: '2rem 0 0', padding: 0, display: 'grid', gap: '0.75rem' }}
        >
          {ATTESTATIONS.map((a) => {
            const s = STATUS_COLORS[a.status]
            return (
              <li key={a.id}>
                <Link
                  to={`/attestations/${a.id}`}
                  aria-label={`View attestation ${a.id}, status ${a.status}`}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    textDecoration: 'none',
                    transition: 'border-color 160ms',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(94,234,212,0.4)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(148,163,184,0.2)')}
                >
                  <code style={{ flex: 1, minWidth: 0, fontSize: '0.9rem', color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {a.id}
                  </code>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {new Date(a.timestamp).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {a.recordCount} records
                  </span>
                  <span
                    style={{
                      padding: '0.2rem 0.7rem',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: s.bg,
                      color: s.color,
                    }}
                  >
                    {a.status}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
