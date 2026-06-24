

type AttestationStatus = 'pending' | 'verified' | 'failed'

type AttestationListItem = {
  id: string
  status: AttestationStatus
  createdAt: string
  merkleRoot: string
  source: string
  amount: string
}

const DEMO_ATTESTATIONS: AttestationListItem[] = [
  {
    id: 'att-001',
    status: 'verified',
    createdAt: '2026-05-28T14:32:00Z',
    merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
    source: 'Stripe (live)',
    amount: '$84,320.00',
  },
  {
    id: 'att-002',
    status: 'pending',
    createdAt: '2026-06-01T09:10:00Z',
    merkleRoot: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    source: 'Stripe (live)',
    amount: '$42,150.00',
  },
]

const STATUS_STYLE: Record<AttestationStatus, { background: string; color: string; border: string }> = {
  verified: {
    background: 'var(--success-soft)',
    color: '#dcfff1',
    border: 'rgba(52, 211, 153, 0.35)',
  },
  pending: {
    background: 'var(--warning-soft)',
    color: '#fff1c4',
    border: 'rgba(251, 191, 36, 0.35)',
  },
  failed: {
    background: 'var(--danger-soft)',
    color: '#ffd7dd',
    border: 'rgba(251, 113, 133, 0.35)',
  },
}

function StatusBadge({ status }: { status: AttestationStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        borderRadius: 999,
        border: `1px solid ${s.border}`,
        background: s.background,
        color: s.color,
        fontWeight: 700,
        fontSize: '0.82rem',
      }}
    >
      {status}
    </span>
  )
}

function middleEllipsis(value: string, start = 10, end = 10) {
  if (value.length <= start + end + 3) return value
  return `${value.slice(0, start)}…${value.slice(-end)}`
}

export default function Attestations() {
  const attestations = DEMO_ATTESTATIONS

  return (
    <div style={{ maxWidth: 1040 }}>
      <header style={{ display: 'grid', gap: '0.6rem' }}>
        <h1 style={{ margin: 0 }}>Attestations</h1>
        <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.65 }}>
          Revenue attestations published on Stellar. Merkle roots and metadata are stored
          on-chain, with a proof-history timeline for each run.
        </p>
      </header>

      <section
        style={{
          marginTop: '1.75rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
        }}
      >
        <div
          role="table"
          aria-label="Attestations table"
          style={{ width: '100%' }}
        >
          <div
            role="rowgroup"
            aria-label="Attestations table header"
          >
            <div role="row" style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0', fontWeight: 700, color: 'var(--muted)', fontSize: '0.85rem' }}>
              <div role="columnheader" style={{ flex: '0 0 120px' }}>Status</div>
              <div role="columnheader" style={{ flex: '0 0 200px' }}>Date</div>
              <div role="columnheader" style={{ flex: '1 1 auto' }}>Merkle Root</div>
              <div role="columnheader" style={{ flex: '0 0 120px' }}>Amount</div>
              <div role="columnheader" style={{ flex: '0 0 80px' }}>Details</div>
            </div>
          </div>
          <div role="rowgroup">
            {attestations.map((item) => (
              <div
                key={item.id}
                role="row"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '0.75rem 0',
                  borderTop: '1px solid var(--border)',
                  alignItems: 'center',
                }}
              >
                <div role="cell" style={{ flex: '0 0 120px' }}>
                  <StatusBadge status={item.status} />
                </div>
                <div role="cell" style={{ flex: '0 0 200px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  <time dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                    }).format(new Date(item.createdAt))}
                  </time>
                </div>
                <div role="cell" style={{ flex: '1 1 auto', fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {middleEllipsis(item.merkleRoot)}
                </div>
                <div role="cell" style={{ flex: '0 0 120px', color: 'var(--muted)' }}>
                  {item.amount}
                </div>
                <div role="cell" style={{ flex: '0 0 80px' }}>
                  <a href={`/attestations/${item.id}`} style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
