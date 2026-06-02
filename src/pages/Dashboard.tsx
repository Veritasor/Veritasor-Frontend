import { useState } from 'react'
import { DashboardSkeleton } from '../components/SkeletonLoader'

/**
 * Dashboard Page
 *
 * Displays key metrics and quick actions for revenue management.
 * Implements loading skeleton for improved perceived performance.
 *
 * Accessibility:
 * - aria-busy attribute on loading states
 * - Semantic heading hierarchy
 * - Loading state announced to screen readers via role="status"
 *
 * Responsive:
 * - Metrics grid adapts to viewport width
 * - Mobile-optimized padding and spacing
 */
export default function Dashboard() {
  // Simulated loading state - in production, this would be driven by data fetching
  const [isLoading] = useState(false)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connect your revenue sources and manage attestations from here.
      </p>

      {/* Metrics Section */}
      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Key Metrics</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Sample metric cards */}
          {[
            { label: 'Monthly Revenue', value: '$12,345' },
            { label: 'Attestations', value: '24' },
            { label: 'Connected Sources', value: '3' },
            { label: 'Last Updated', value: 'Today' },
          ].map((metric, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                {metric.label}
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent)' }}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {/* Quick actions section */}
        <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Quick actions</h3>
          <ul style={{ color: 'var(--muted)', margin: 0, paddingLeft: '1.5rem' }}>
            <li>Connect Stripe, Razorpay, or Shopify (coming soon)</li>
            <li>Trigger monthly revenue report</li>
            <li>View attestation history</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
