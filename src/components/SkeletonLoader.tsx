/**
 * Skeleton Loading Components
 *
 * Provides accessible skeleton loaders for Dashboard and Attestations pages.
 * Implements WCAG 2.1 AA compliant loading states with:
 * - aria-busy attribute for screen reader announcement
 * - Shimmer animation with reduced motion support
 * - Responsive design matching final layouts
 */

export function DashboardSkeleton() {
  return (
    <div
      className="loading-region"
      aria-busy="true"
      aria-label="Loading dashboard metrics"
      role="status"
    >
      <h2 style={{ marginTop: 0, fontSize: '1rem' }} className="skeleton skeleton-text" />

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <div className="skeleton-card-content">
          {/* Metrics grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="skeleton-metric">
                <div className="skeleton skeleton-metric-label" />
                <div className="skeleton skeleton-metric-value" />
              </div>
            ))}
          </div>

          {/* Actions list skeleton */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.95rem' }} className="skeleton skeleton-text-short" />
            <ul style={{ color: 'var(--muted)', listStyle: 'none', padding: 0, margin: '1rem 0 0 0' }}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <li key={idx} style={{ marginBottom: '0.75rem' }}>
                  <div className="skeleton skeleton-text-medium" style={{ marginBottom: 0 }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AttestationsSkeleton() {
  return (
    <div
      className="loading-region"
      aria-busy="true"
      aria-label="Loading attestations list"
      role="status"
    >
      <h2 style={{ marginTop: 0, fontSize: '1rem' }} className="skeleton skeleton-text" />

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <div className="skeleton-list">
          {/* Column headers skeleton */}
          <div className="skeleton-row-header" style={{ display: 'grid', marginBottom: '1rem' }}>
            <div className="skeleton skeleton-text-short" style={{ marginBottom: 0 }} />
            <div className="skeleton skeleton-text-short" style={{ marginBottom: 0 }} />
            <div className="skeleton skeleton-text-short" style={{ marginBottom: 0 }} />
          </div>

          {/* Row skeletons */}
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="skeleton-row">
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="skeleton-metric">
      <div className="skeleton skeleton-metric-label" />
      <div className="skeleton skeleton-metric-value" />
    </div>
  )
}

export function AttestationRowSkeleton() {
  return (
    <div className="skeleton-row">
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" />
    </div>
  )
}
