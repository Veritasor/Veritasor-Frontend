import { useState } from 'react'
import { Link } from 'react-router-dom'
import AttestationConfirmModal from '../components/AttestationConfirmModal'

const DEMO_DETAILS = {
  source: 'Stripe (live)',
  period: 'May 2026',
  recordCount: 1247,
  merkleRoot: '0x4a2f8c3d1e6b9f0a2d5c8e1b4f7a0d3c6e9b2f5a8d1c4e7b0a3f6c9d2e5b8a1c4',
}

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
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connect your revenue sources and manage attestations from here.
      </p>
      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Quick actions</h2>
        <ul style={{ color: 'var(--muted)', paddingLeft: '1.25rem' }}>
          <li>
            <Link
              to="/connect-source/provider"
              aria-label="Open connect source wizard"
            >
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
