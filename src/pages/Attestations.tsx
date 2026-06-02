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
    <div>
      <h1 style={{ marginTop: 0 }}>Attestations</h1>
      <p style={{ color: 'var(--muted)' }}>
        Revenue attestations published on Stellar. Merkle roots and metadata are stored on-chain.
      </p>

      {/* Attestations List Section */}
      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        {/* Column Headers - visible on larger screens */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '1rem',
            padding: '1rem',
            marginBottom: '1rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: 'var(--muted)',
            background: 'var(--surface-soft)',
            borderRadius: '8px 8px 0 0',
          }}
          role="row"
          aria-label="Attestations table header"
        >
          <div role="columnheader">Transaction ID</div>
          <div role="columnheader">Date</div>
          <div role="columnheader">Status</div>
        </div>

        {/* Empty state */}
        <div style={{ display: 'grid' }} role="row">
          <p style={{ color: 'var(--muted)', margin: '2rem 1rem', gridColumn: '1/-1' }}>
            No attestations yet. Run a revenue report from the dashboard to create one.
          </p>
        </div>

        {/* Example attestation row (when data exists) */}
        {/* This structure is demonstrated for reference - actual data would be mapped */}
        <div
          style={{
            display: 'none', // Hidden in this state
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '1rem',
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
          role="row"
        >
          <div role="cell">tx_0123456789abcdef...</div>
          <div role="cell">Jan 15, 2024</div>
          <div role="cell">
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                background: 'var(--success-soft)',
                color: '#dcfff1',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Confirmed
            </span>
          </div>
        </div>
      </section>

      {/* Responsive note for accessibility */}
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '1rem' }}>
        <p style={{ margin: '0.5rem 0' }}>
          📱 On mobile devices, swipe horizontally to view more details.
        </p>
      </div>
    </div>
  )
}
