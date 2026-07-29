import { useState } from 'react'
import { Link } from 'react-router-dom'
import AttestationConfirmModal from '../components/AttestationConfirmModal'

const DEMO_DETAILS = {
  source: 'Stripe (live)',
  period: 'May 2026',
  recordCount: 1247,
  merkleRoot: '0x4a2f8c3d1e6b9f0a2d5c8e1b4f7a0d3c6e9b2f5a8d1c4e7b0a3f6c9d2e5b8a1c4',
}

const METRICS = [
  { label: 'Total Revenue', value: '$84,320', sub: 'YTD 2026' },
  { label: 'Attestations', value: '12', sub: 'This month' },
  { label: 'Revenue Sources', value: '3', sub: 'Connected' },
]

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [attestError, setAttestError] = useState<string | null>(null)

  async function handleConfirm() {
    setIsLoading(true)
    setAttestError(null)
    await Promise.resolve()
    setIsLoading(false)
    setModalOpen(false)
  }

  function handleClose() {
    setModalOpen(false)
    setAttestError(null)
  }

  return (
    <div className="dashboard-page">
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connect your revenue sources and manage attestations from here.
      </p>

      <div className="dashboard-grid">
        <section className="dashboard-section">
          <h2>Key metrics</h2>
          <div className="dashboard-metrics-grid">
            {METRICS.map((m) => (
              <div key={m.label} className="dashboard-metric-card">
                <span className="dashboard-metric-label">{m.label}</span>
                <span className="dashboard-metric-value">{m.value}</span>
                <span className="dashboard-metric-sub">{m.sub}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h2>Quick actions</h2>
          <ul className="dashboard-actions-list">
            <li>
              <Link to="/connect-source/provider" aria-label="Open connect source wizard">
                Connect Stripe, Razorpay, or Shopify
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="dashboard-action-btn"
                onClick={() => setModalOpen(true)}
              >
                Trigger monthly revenue report
              </button>
            </li>
            <li>View attestation history</li>
          </ul>
        </section>
      </div>

      <AttestationConfirmModal
        open={modalOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isLoading={isLoading}
        error={attestError}
        details={DEMO_DETAILS}
      />
    </div>
  )
}
