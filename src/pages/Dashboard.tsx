import { useState, useEffect, useRef } from 'react'
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

// ─── Monthly revenue data (bar chart) ─────────────────────────────────
const MONTHLY_DATA = [
  { month: 'Jan', revenue: 14200 },
  { month: 'Feb', revenue: 13800 },
  { month: 'Mar', revenue: 15100 },
  { month: 'Apr', revenue: 16200 },
  { month: 'May', revenue: 15900 },
  { month: 'Jun', revenue: 17100 },
]

// ─── Trend data (line chart) ──────────────────────────────────────────
const TREND_DATA = [
  { week: 'W1', value: 3400 },
  { week: 'W2', value: 3800 },
  { week: 'W3', value: 3600 },
  { week: 'W4', value: 4200 },
  { week: 'W5', value: 4100 },
  { week: 'W6', value: 4500 },
  { week: 'W7', value: 4300 },
  { week: 'W8', value: 4700 },
]

// ─── useChartVisibility: pauses animation when off-screen ─────────────
function useChartVisibility() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

// ─── BarChart ─────────────────────────────────────────────────────────
function BarChart() {
  const { ref, visible } = useChartVisibility()
  const maxVal = Math.max(...MONTHLY_DATA.map((d) => d.revenue))
  const W = 400
  const H = 160
  const pad = { top: 10, bottom: 28, left: 50, right: 12 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom
  const barW = Math.max(8, (chartW / MONTHLY_DATA.length) * 0.6)
  const gap = chartW / MONTHLY_DATA.length

  return (
    <div
      ref={ref}
      className="dashboard-chart"
      role="img"
      aria-label="Bar chart showing monthly revenue from January to June 2026"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        style={{ maxWidth: 520, display: 'block' }}
        aria-hidden="true"
      >
        {/* Y-axis labels */}
        {[0, 0.5, 1].map((pct) => {
          const y = pad.top + chartH * (1 - pct)
          const label = `$${Math.round((maxVal * pct) / 1000)}k`
          return (
            <g key={pct}>
              <line
                x1={pad.left}
                y1={y}
                x2={W - pad.right}
                y2={y}
                stroke="var(--border)"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={pad.left - 6}
                y={y + 4}
                textAnchor="end"
                fill="var(--muted)"
                fontSize={9}
              >
                {label}
              </text>
            </g>
          )
        })}
        {/* Bars */}
        {MONTHLY_DATA.map((d, i) => {
          const barH = (d.revenue / maxVal) * chartH
          const x = pad.left + i * gap + (gap - barW) / 2
          const y = pad.top + chartH - barH
          return (
            <g key={d.month}>
              <rect
                className="chart-bar"
                x={x}
                y={visible ? y : pad.top + chartH}
                width={barW}
                height={visible ? barH : 0}
                rx={3}
                fill="url(#barGrad)"
                style={{
                  transition: visible
                    ? 'y var(--motion-duration-lg) var(--motion-easing-standard), height var(--motion-duration-lg) var(--motion-easing-standard)'
                    : 'none',
                }}
              />
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize={9}
              >
                {d.month}
              </text>
            </g>
          )
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="rgba(94, 234, 212, 0.3)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ─── LineChart ─────────────────────────────────────────────────────────
function LineChart() {
  const { ref, visible } = useChartVisibility()
  const maxVal = Math.max(...TREND_DATA.map((d) => d.value))
  const minVal = Math.min(...TREND_DATA.map((d) => d.value))
  const W = 400
  const H = 160
  const pad = { top: 14, bottom: 28, left: 50, right: 16 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  const points = TREND_DATA.map((d, i) => {
    const x = pad.left + (i / (TREND_DATA.length - 1)) * chartW
    const y = pad.top + chartH * (1 - (d.value - minVal) / (maxVal - minVal || 1))
    return { x, y, ...d }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`

  const dashLen = visible ? pathD.length : 0

  return (
    <div
      ref={ref}
      className="dashboard-chart"
      role="img"
      aria-label="Line chart showing weekly revenue trend over 8 weeks"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        style={{ maxWidth: 520, display: 'block' }}
        aria-hidden="true"
      >
        {/* Y-axis grid */}
        {[0, 0.5, 1].map((pct) => {
          const y = pad.top + chartH * (1 - pct)
          const val = Math.round(minVal + (maxVal - minVal) * pct)
          return (
            <g key={pct}>
              <line
                x1={pad.left}
                y1={y}
                x2={W - pad.right}
                y2={y}
                stroke="var(--border)"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={pad.left - 6}
                y={y + 4}
                textAnchor="end"
                fill="var(--muted)"
                fontSize={9}
              >
                ${(val / 1000).toFixed(1)}k
              </text>
            </g>
          )
        })}
        {/* Area fill */}
        <path
          d={areaD}
          fill="url(#areaGrad)"
          opacity={visible ? 0.18 : 0}
          style={{
            transition: visible
              ? 'opacity var(--motion-duration-md) var(--motion-easing-standard)'
              : 'none',
          }}
        />
        {/* Line */}
        <path
          className="chart-line"
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashLen}
          strokeDashoffset={visible ? 0 : dashLen}
          style={{
            transition: visible
              ? 'stroke-dashoffset var(--motion-duration-xl) var(--motion-easing-standard)'
              : 'none',
          }}
        />
        {/* Data points */}
        {points.map((p) => (
          <circle
            key={p.week}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="var(--surface-strong)"
            stroke="var(--accent)"
            strokeWidth={2}
            opacity={visible ? 1 : 0}
            style={{
              transition: visible
                ? 'opacity var(--motion-duration-sm) var(--motion-easing-standard)'
                : 'none',
            }}
          />
        ))}
        {/* X-axis labels */}
        {points.map((p) => (
          <text
            key={`label-${p.week}`}
            x={p.x}
            y={H - 6}
            textAnchor="middle"
            fill="var(--muted)"
            fontSize={9}
          >
            {p.week}
          </text>
        ))}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────
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
        {/* Key metrics */}
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

        {/* Quick actions */}
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

        {/* Monthly revenue bar chart */}
        <section className="dashboard-section dashboard-chart-card">
          <h2>Monthly Revenue</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            Revenue breakdown for the last 6 months from all connected sources.
          </p>
          <BarChart />
        </section>

        {/* Weekly trend line chart */}
        <section className="dashboard-section dashboard-chart-card">
          <h2>Weekly Trend</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            Weekly revenue trend for the last 8 weeks.
          </p>
          <LineChart />
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
