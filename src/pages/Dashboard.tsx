import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AttestationConfirmModal from '../components/AttestationConfirmModal'
import AttestationTrendChart from '../components/AttestationTrendChart'
import DateRangePicker from '../components/DateRangePicker'
import { DashboardSkeleton } from '../components/SkeletonLoader'
import UsageMeter from '../components/UsageMeter'
import StaleDataChip from '../components/StaleDataChip'
import { useViewportObserver } from '../hooks/useViewportObserver'
import { useToast } from '../components/ToastContext'
import { useAttestations } from '../state/attestations'
import { DEFAULT_TRIGGER_DETAILS } from '../state/attestationMocks'
import { track } from '../analytics'

const METRICS = [
  { label: 'Total Revenue', value: '$84,320', sub: 'YTD 2026' },
  { label: 'Attestations', value: '12', sub: 'This month' },
  { label: 'Revenue Sources', value: '3', sub: 'Connected' },
]
import { aggregateAttestationTrend } from '../utils/attestationChartData'
import {
  computeDashboardKpis,
  formatAvgTime,
  formatVerifiedRate,
  getLatestAttestationDate,
  isValidIsoDate,
  type DateRange,
} from '../utils/dashboardSelectors'

// Demo usage data — swap for real API values in production
const USAGE_DATA = [
  {
    label: 'Attestations',
    used: 9,
    limit: 10,
    unit: 'attestations',
    period: 'July 2026',
  },
  {
    label: 'API calls',
    used: 7_520,
    limit: 10_000,
    unit: 'calls',
    period: 'July 2026',
  },
]

export const STALE_DATA_THRESHOLD_MS = 5 * 60 * 1000

export function isAttestationDataStale(lastUpdated: string, now = Date.now()) {
  const updatedAt = Date.parse(lastUpdated)
  return Number.isFinite(updatedAt) && now - updatedAt >= STALE_DATA_THRESHOLD_MS
}

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [attestError, setAttestError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const { trigger, lastUpdated, refresh } = useAttestations()
  const { list: attestations, trigger } = useAttestations()
  const { status, error: loadError, trigger, lastUpdated, refresh } = useAttestations()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawFrom = searchParams.get('from') ?? undefined
  const rawTo = searchParams.get('to') ?? undefined
  const from = isValidIsoDate(rawFrom) ? rawFrom : undefined
  const to = isValidIsoDate(rawTo) ? rawTo : undefined

  const referenceDate = useMemo(
    () => getLatestAttestationDate(attestations) ?? undefined,
    [attestations],
  )

  const kpis = useMemo(
    () => computeDashboardKpis(attestations, { from, to }),
    [attestations, from, to],
  )

  const trendData = useMemo(
    () => aggregateAttestationTrend(attestations, { from, to, bucket: 'auto' }),
    [attestations, from, to],
  )

  const metrics = useMemo(
    () => [
      {
        label: 'Verified Rate',
        value: formatVerifiedRate(kpis.verifiedRate),
        sub: `${kpis.verified} of ${kpis.total} attestations`,
      },
      {
        label: 'Pending',
        value: String(kpis.pending),
        sub: 'Awaiting verification',
      },
      {
        label: 'Failed',
        value: String(kpis.failed),
        sub: 'Needs attention',
      },
      {
        label: 'Avg Time',
        value: formatAvgTime(kpis.avgTimeMs),
        sub: 'Mean verification time',
      },
    ],
    [kpis],
  )

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  const isStale = isAttestationDataStale(lastUpdated, now)

  function handleRefresh() {
    void refresh()
    setNow(Date.now())
  }

  // Entrance animation observers — one per metric card
  const { ref: verifiedRef, isVisible: verifiedVisible } = useViewportObserver<HTMLDivElement>()
  const { ref: pendingRef, isVisible: pendingVisible } = useViewportObserver<HTMLDivElement>()
  const { ref: failedRef, isVisible: failedVisible } = useViewportObserver<HTMLDivElement>()
  const { ref: avgTimeRef, isVisible: avgTimeVisible } = useViewportObserver<HTMLDivElement>()
  const { ref: usageSectionRef, isVisible: usageVisible } = useViewportObserver<HTMLDivElement>({ threshold: 0.05 })
  const { ref: actionsRef, isVisible: actionsVisible } = useViewportObserver<HTMLDivElement>()

  function handleDateRangeChange(nextRange: DateRange) {
    const next = new URLSearchParams(searchParams)
    if (isValidIsoDate(nextRange.from)) {
      next.set('from', nextRange.from)
    } else {
      next.delete('from')
    }
    if (isValidIsoDate(nextRange.to)) {
      next.set('to', nextRange.to)
    } else {
      next.delete('to')
    }
    setSearchParams(next, { replace: true })
  }

  async function handleConfirm() {
    setIsLoading(true)
    setAttestError(null)
    try {
      await trigger(DEFAULT_TRIGGER_DETAILS)
      track('attestation_created', {
        source: DEFAULT_TRIGGER_DETAILS.source,
        period: DEFAULT_TRIGGER_DETAILS.period,
        recordCount: DEFAULT_TRIGGER_DETAILS.recordCount,
      })
      addToast('Attestation submitted successfully.', 'success')
      setModalOpen(false)
    } catch (err) {
      setAttestError(err instanceof Error ? err.message : 'Failed to process attestation')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setModalOpen(false)
    setAttestError(null)
  }

  return (
    <div className="dashboard-page">
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connect your revenue sources and manage attestations from here. (Demo build: all figures shown are sample data.)
      </p>
      <div className="dashboard-data-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        {isStale && <StaleDataChip fetchedAt={lastUpdated} />}
        <button type="button" className="dashboard-action-btn" onClick={handleRefresh}>
          Refresh data
        </button>
      </div>

      {status === 'loading' ? (
        <DashboardSkeleton />
      ) : status === 'error' ? (
        <div
          role="alert"
          style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--danger)',
            background: 'var(--danger-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
              Failed to load dashboard data
            </strong>
            <span>{loadError ?? 'An unexpected error occurred.'}</span>
          </div>
          <button type="button" className="dashboard-action-btn" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
        <section className="dashboard-section">
          <h2>Key metrics</h2>
          <div className="dashboard-metrics-grid">
            {METRICS.map((m, i) => {
              const refs = [revenueRef, attestationsRef, sourcesRef]
              const visibles = [revenueVisible, attestationsVisible, sourcesVisible]
              const metricRef = refs[i] ?? refs[0]
              const isVisible = visibles[i] ?? false
              return (
                <div
                  key={m.label}
                  ref={metricRef}
                  className={`dashboard-metric-card chart-entrance chart-entrance-bar-grow${isVisible ? ' chart-entrance-animate' : ''}`}
                  style={{
                    transitionDelay: `${i * 60}ms`,
                    animationDelay: `${i * 60}ms`,
                    willChange: isVisible ? undefined : 'opacity, transform',
                  }}
                >
                  <span className="dashboard-metric-label">{m.label}</span>
                  <span className="dashboard-metric-value">{m.value}</span>
                  <span className="dashboard-metric-sub">{m.sub}</span>
                </div>
              )
            })}
          </div>
        </section>
      <div className="dashboard-header-row">
        <div>
          <h1 style={{ marginTop: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
            Connect your revenue sources and manage attestations from here.
          </p>
        </div>

        <DateRangePicker
          from={from}
          to={to}
          referenceDate={referenceDate}
          onChange={handleDateRangeChange}
        />
      </div>

      {isLoading && (
        <div className="dashboard-loading-banner" role="status" aria-live="polite">
          Aggregating revenue and attestation data...
        </div>
      )}

      {attestations.length === 0 ? (
        <section className="dashboard-section" aria-label="Dashboard empty state">
          <h2>Get started</h2>
          <p style={{ color: 'var(--muted)' }}>
            Your dashboard is ready. Connect a data source to begin evaluating revenue and attestations.
          </p>
          <Link to="/connect-source/provider" className="dashboard-action-btn">
            Connect Integration
          </Link>
        </section>
      ) : (
        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2>Key metrics</h2>
            <div className="dashboard-metrics-grid">
              {metrics.map((m, i) => {
                const refs = [verifiedRef, pendingRef, failedRef, avgTimeRef]
                const visibles = [verifiedVisible, pendingVisible, failedVisible, avgTimeVisible]
                const metricRef = refs[i] ?? refs[0]
                const isVisible = visibles[i] ?? false
                return (
                  <div
                    key={m.label}
                    ref={metricRef}
                    className={`dashboard-metric-card chart-entrance chart-entrance-bar-grow${isVisible ? ' chart-entrance-animate' : ''}`}
                    style={{
                      transitionDelay: `${i * 60}ms`,
                      animationDelay: `${i * 60}ms`,
                      willChange: isVisible ? undefined : 'opacity, transform',
                    }}
                  >
                    <span className="dashboard-metric-label">{m.label}</span>
                    <span className="dashboard-metric-value">{m.value}</span>
                    <span className="dashboard-metric-sub">{m.sub}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section
            className={`dashboard-section${actionsVisible ? ' chart-entrance chart-entrance-animate' : ' chart-entrance'}`}
            ref={actionsRef}
          >
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
              <li><Link to="/attestations">View attestation history</Link></li>
            </ul>
          </section>

          <div className="dashboard-section dashboard-chart-card">
            <AttestationTrendChart
              data={trendData}
              title="Attestation trend"
              showStatusFilter
            />
          </div>

          <section
            className={`dashboard-section chart-entrance chart-entrance-line-draw${usageVisible ? ' chart-entrance-animate' : ''}`}
            ref={usageSectionRef}
            aria-labelledby="usage-heading"
          >
            <h2 id="usage-heading">Usage this month</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {USAGE_DATA.map((u) => (
                <UsageMeter
                  key={u.label}
                  label={u.label}
                  used={u.used}
                  limit={u.limit}
                  unit={u.unit}
                  period={u.period}
                />
              ))}
            </div>
          </section>
        </div>
        </section>
      </div>
      )}

      <AttestationConfirmModal
        open={modalOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isLoading={isLoading}
        error={attestError}
        details={DEFAULT_TRIGGER_DETAILS}
      />
    </div>
  )
}
