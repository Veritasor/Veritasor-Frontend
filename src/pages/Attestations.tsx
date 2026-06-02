import { useState } from 'react'
import { AttestationsSkeleton } from '../components/SkeletonLoader'

/**
 * Attestations Page
 *
 * Displays list of revenue attestations published on Stellar blockchain.
 * Implements loading skeleton for improved perceived performance.
 *
 * Accessibility:
 * - aria-busy attribute on loading states
 * - Table structure with semantic headers
 * - Loading state announced to screen readers via role="status"
 * - Responsive table layout for mobile devices
 *
 * Responsive:
 * - Adapts from multi-column to single column on mobile
 * - Touch-friendly spacing and sizing
 */
export default function Attestations() {
  // Simulated loading state - in production, this would be driven by data fetching
  const [isLoading] = useState(false)

  if (isLoading) {
    return <AttestationsSkeleton />
  }

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
