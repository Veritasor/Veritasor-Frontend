import { memo, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TriggerAttestationFAB from '../components/TriggerAttestationFAB'
import AttestationConfirmModal, { type FeeInfo } from '../components/AttestationConfirmModal'
import { AttestationCalendar } from '../components/scheduling/AttestationCalendar'
import { getAttestationChartGeometry, getAttestationChartLabelIndices } from '../utils/attestationChartData'
import { EmptyStateIllustration } from '../components/EmptyStateIllustrations'
import SearchFilter, { parseFilterState, type ChipDef } from '../components/SearchFilter'
import { useToast } from '../components/ToastContext'
import { useAttestations, type Attestation } from '../state/attestations'
import { DEFAULT_TRIGGER_DETAILS } from '../state/attestationMocks'
import {
  generateOccurrences,
  getDateInTimeZone,
  scheduleStore,
  useSchedules,
  type ScheduleRule,
} from '../store/scheduleStore'
import { track } from '../analytics'

export const PAGE_SIZE = 50

const STATUS_CHIPS: ChipDef[] = [
  { id: 'verified', label: 'Verified', color: 'success' },
  { id: 'pending', label: 'Pending', color: 'warning' },
  { id: 'failed', label: 'Failed', color: 'danger' },
]

const MOCK_FEE_INFO: FeeInfo = {
  total: 2.5,
  breakdown: [
    { label: 'Network fee', amount: 0.001 },
    { label: 'Attestation service', amount: 2.499 },
  ],
}

// ─── Types ────────────────────────────────────────────────────────────────

type AttestationStatus = Attestation['status']
type AttestationListItem = Pick<Attestation, 'id' | 'status' | 'createdAt' | 'merkleRoot'>

type AttestationStatusMeta = {
  label: string
  background: string
  border: string
  text: string
  marker: string
  icon: (props: { size: number }) => JSX.Element
}

const STATUS_META: Record<AttestationStatus, AttestationStatusMeta> = {
  pending: {
    label: "Pending",
    background: "var(--warning-soft)",
    border: "rgba(251, 191, 36, 0.35)",
    text: "#fff1c4",
    marker: "var(--warning)",
    icon: ({ size }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  verified: {
    label: "Verified",
    background: "var(--success-soft)",
    border: "rgba(52, 211, 153, 0.35)",
    text: "#dcfff1",
    marker: "var(--success)",
    icon: ({ size }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  failed: {
    label: "Failed",
    background: "var(--danger-soft)",
    border: "rgba(251, 113, 133, 0.35)",
    text: "#ffd7dd",
    marker: "var(--danger)",
    icon: ({ size }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M18 6 6 18M6 6l12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatCompactDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function middleEllipsis(value: string, start = 10, end = 10) {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}
type TrendBucket = {
  dateKey: string
  label: string
  counts: Record<AttestationStatus, number>
  total: number
}

const TREND_STATUS_ORDER: AttestationStatus[] = ['verified', 'pending', 'failed']

function getDateKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTrendLabel(dateKey: string): string {
  if (dateKey === 'Unknown') return 'Unknown'
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day))
}

function buildTrendBuckets(attestations: AttestationListItem[]): TrendBucket[] {
  const buckets = new Map<string, Record<AttestationStatus, number>>()

  for (const attestation of attestations) {
    const key = getDateKey(attestation.createdAt)
    const counts = buckets.get(key) ?? { verified: 0, pending: 0, failed: 0 }
    counts[attestation.status] += 1
    buckets.set(key, counts)
  }

  const datedBuckets = Array.from(buckets.entries())
    .filter(([dateKey]) => dateKey !== 'Unknown')
    .sort(([a], [b]) => a.localeCompare(b))
  const expandedBuckets: Array<[string, Record<AttestationStatus, number>]> = []

  if (datedBuckets.length > 0) {
    const firstDate = new Date(`${datedBuckets[0][0]}T00:00:00Z`)
    const lastDate = new Date(`${datedBuckets[datedBuckets.length - 1][0]}T00:00:00Z`)
    const countsByDate = new Map(datedBuckets)
    for (const date = new Date(firstDate); date <= lastDate; date.setUTCDate(date.getUTCDate() + 1)) {
      const dateKey = date.toISOString().slice(0, 10)
      expandedBuckets.push([
        dateKey,
        countsByDate.get(dateKey) ?? { verified: 0, pending: 0, failed: 0 },
      ])
    }
  }

  const unknownCounts = buckets.get('Unknown')
  if (unknownCounts) {
    expandedBuckets.unshift(['Unknown', unknownCounts])
  }

  return expandedBuckets.map(([dateKey, counts]) => ({
    dateKey,
    label: formatTrendLabel(dateKey),
    counts,
    total: counts.verified + counts.pending + counts.failed,
  }))
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AttestationStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "var(--density-badge-padding)",
        borderRadius: 999,
        border: `1px solid ${meta.border}`,
        background: meta.background,
        color: meta.text,
        fontWeight: 700,
        fontSize: "var(--density-badge-font)",
        letterSpacing: "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <Icon size={16} />
      </span>
      <span>{meta.label}</span>
    </span>
  );
}

function EmptyState({ onRunReport }: { onRunReport: () => void }) {
  return (
    <section
      aria-label="Attestations empty state"
      style={{
        marginTop: "var(--density-gap)",
        padding: "var(--density-padding)",
        background: "var(--surface)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        boxShadow: "0 20px 50px rgba(2, 6, 23, 0.22)",
      }}
    >
      <EmptyStateIllustration type="attestations" />
      <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 720 }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>No attestations yet</h2>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.65 }}>
          Attestations appear here after you run a revenue report. Each
          attestation includes an on-chain Merkle root and a proof-history
          timeline as verification progresses.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={onRunReport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.85rem 1rem",
              borderRadius: 12,
              fontWeight: 800,
              color: "#04111f",
              background: "linear-gradient(135deg, var(--accent), #60a5fa)",
              border: "1px solid transparent",
              minHeight: "3rem",
              cursor: 'pointer',
            }}
          >
            Run a revenue report
          </button>
          <div
            style={{
              flex: "1 1 260px",
              minWidth: 240,
              padding: "0.85rem 1rem",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(148, 163, 184, 0.08)",
              color: "var(--muted)",
              lineHeight: 1.55,
            }}
          >
            Tip: once you've run a report, you'll be able to review the proof
            timeline and copy the Merkle root for audits.
          </div>
        </div>
      </div>
    </section>
  );
}
const AttestationTrendChart = memo(function AttestationTrendChart({
  attestations,
}: {
  attestations: AttestationListItem[]
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const buckets = buildTrendBuckets(attestations);

  if (buckets.length === 0) {
    return (
      <section aria-label="Attestation activity trend" style={{ marginTop: '1.5rem', padding: 'var(--density-padding)', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Attestation activity</h2>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)' }}>No attestation history is available to chart.</p>
      </section>
    );
  }

  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const chartWidth = 640;
  const chartHeight = 160;
  const { barWidth, positions } = getAttestationChartGeometry(buckets.length, chartWidth);
  const centers = positions.map((position) => position + barWidth / 2);
  const labelIndices = new Set(
    getAttestationChartLabelIndices(buckets.map((bucket) => bucket.label), centers),
  );
  const selected = focusedIndex === null ? null : buckets[focusedIndex];

  function focusBar(index: number) {
    const next = Math.max(0, Math.min(buckets.length - 1, index));
    document.getElementById(`attestation-trend-bar-${next}`)?.focus();
    setFocusedIndex(next);
  }

  return (
    <section aria-label="Attestation activity trend" style={{ marginTop: '1.5rem', padding: 'var(--density-padding)', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Attestation activity</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>Daily attestation volume by status.</p>
        </div>
        <button type="button" onClick={() => setView(view === 'chart' ? 'table' : 'chart')} style={{ minHeight: 'var(--density-touch-min)', padding: '0.5rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>
          {view === 'chart' ? 'View as table' : 'View as chart'}
        </button>
      </div>

      {view === 'table' ? (
        <div style={{ overflowX: 'auto' }}>
          <table aria-label="Attestation history" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <caption style={{ textAlign: 'left', marginBottom: '0.5rem', color: 'var(--muted)' }}>Attestation volume by date and status</caption>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', textAlign: 'left' }}>
                <th scope="col" style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Date</th>
                <th scope="col" style={{ padding: '0.5rem' }}>Verified</th>
                <th scope="col" style={{ padding: '0.5rem' }}>Pending</th>
                <th scope="col" style={{ padding: '0.5rem' }}>Failed</th>
                <th scope="col" style={{ padding: '0.5rem 0 0.5rem 0.5rem' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.dateKey} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)' }}>
                  <td style={{ padding: '0.5rem 0.5rem 0.5rem 0', fontWeight: 600 }}>{bucket.label}</td>
                  <td style={{ padding: '0.5rem' }}>{bucket.counts.verified}</td>
                  <td style={{ padding: '0.5rem' }}>{bucket.counts.pending}</td>
                  <td style={{ padding: '0.5rem' }}>{bucket.counts.failed}</td>
                  <td style={{ padding: '0.5rem 0 0.5rem 0.5rem', fontWeight: 700 }}>{bucket.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <figure aria-label="Attestation history" style={{ margin: 0 }}>
          <div role="status" style={{ minHeight: '1.5rem', fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            {selected
              ? `${selected.label}: ${selected.total} attestations, ${selected.counts.verified} verified, ${selected.counts.pending} pending, ${selected.counts.failed} failed`
              : 'Focus a bar to see daily details.'}
          </div>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`} role="img" aria-labelledby="attestation-trend-title" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <title id="attestation-trend-title">Attestation activity over time</title>
            <defs>
              <pattern id="attestation-trend-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="var(--surface)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--danger)" strokeWidth="2" />
              </pattern>
              <pattern id="attestation-trend-dots" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="var(--surface)" />
                <circle cx="4" cy="4" r="1.5" fill="var(--warning)" />
              </pattern>
            </defs>
            {buckets.map((bucket, index) => {
              const x = positions[index];
              let cursor = chartHeight;
              let totalHeight = 0;
              return (
                <g
                  key={bucket.dateKey}
                  id={`attestation-trend-bar-${index}`}
                  tabIndex={0}
                  role="img"
                  aria-label={`${bucket.label}: ${bucket.total} attestations, ${bucket.counts.verified} verified, ${bucket.counts.pending} pending, ${bucket.counts.failed} failed`}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      focusBar(index + 1);
                    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      focusBar(index - 1);
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      focusBar(0);
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      focusBar(buckets.length - 1);
                    }
                  }}
                  style={{ outline: focusedIndex === index ? '2px solid var(--accent)' : 'none', outlineOffset: '2px' }}
                >
                  {TREND_STATUS_ORDER.map((status) => {
                    const count = bucket.counts[status];
                    if (count === 0) return null;
                    const segmentHeight = (count / maxCount) * chartHeight;
                    const y = cursor - segmentHeight;
                    cursor -= segmentHeight;
                    totalHeight += segmentHeight;
                    const meta = STATUS_META[status];
                    const fill = status === 'failed' ? 'url(#attestation-trend-stripes)' : status === 'pending' ? 'url(#attestation-trend-dots)' : meta.marker;
                    const stroke = status === 'failed' || status === 'pending' ? meta.marker : 'none';
                    return (
                      <rect key={status} x={x} y={y} width={barWidth} height={segmentHeight} fill={fill} stroke={stroke} strokeWidth={stroke === 'none' ? 0 : 2}>
                        <title>{`${bucket.label} ${meta.label}: ${count}`}</title>
                      </rect>
                    );
                  })}
                  <rect x={x} y={chartHeight - totalHeight} width={barWidth} height={totalHeight} fill="transparent" pointerEvents="all" />
                </g>
              );
            })}
            <line x1="12" y1="0" x2="12" y2={chartHeight} stroke="var(--border)" strokeWidth="1" />
            <line x1="12" y1={chartHeight} x2={chartWidth - 12} y2={chartHeight} stroke="var(--border)" strokeWidth="1" />
            {[0, 0.5, 1].map((tick) => {
              const y = chartHeight - tick * chartHeight;
              return (
                <g key={tick}>
                  <line x1="0" y1={y} x2="12" y2={y} stroke="var(--border)" strokeWidth="1" />
                  <text x="4" y={y + 4} textAnchor="middle" fontSize="10" fill="var(--muted)">{Math.round(tick * maxCount)}</text>
                </g>
              );
            })}
            {buckets.map((bucket, index) =>
              labelIndices.has(index) ? (
                <text
                  key={bucket.dateKey}
                  x={centers[index]}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted)"
                >
                  {bucket.label}
                </text>
              ) : null,
            )}
          </svg>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
            {TREND_STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status];
              return (
                <span key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ display: 'block' }}>
                    <rect width="12" height="12" fill={status === 'failed' ? 'url(#attestation-trend-stripes)' : status === 'pending' ? 'url(#attestation-trend-dots)' : meta.marker} stroke={status === 'failed' || status === 'pending' ? meta.marker : 'none'} strokeWidth="1.5" />
                  </svg>
                  {meta.label}
                </span>
              );
            })}
          </div>
          </figure>
        </>
      )}
    </section>
  );
})

const TimelineRow = memo(function TimelineRow({ item }: { item: AttestationListItem }) {
  const meta = STATUS_META[item.status];
  const formattedDate = formatCompactDate(item.createdAt);
  const shortRoot = middleEllipsis(item.merkleRoot, 12, 12);

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '1.25rem 1fr',
        columnGap: '0.9rem',
      }}
    >
      {/* Timeline marker */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: meta.marker,
            boxShadow: '0 0 0 0.35rem rgba(148, 163, 184, 0.10)',
            marginTop: 6,
          }}
        />
      </div>

      <article
        aria-label={`Attestation ${meta.label} created ${formattedDate}`}
        style={{
          padding: "var(--density-padding)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          display: "grid",
          gap: "var(--density-row-gap)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--density-row-gap)",
            flexWrap: "wrap",
          }}
        >
          <StatusBadge status={item.status} />
          <time
            dateTime={item.createdAt}
            style={{
              color: 'var(--muted)',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            {formattedDate}
          </time>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "max-content minmax(0, 1fr)",
            gap: "0.5rem 1rem",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              color: 'var(--muted)',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            Merkle root
          </div>
          <div
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: "var(--density-text-sm)",
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "0.45rem 0.6rem",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "rgba(15, 23, 42, 0.65)",
              minHeight: "var(--density-touch-min)",
            }}
            title={item.merkleRoot}
          >
            {shortRoot}
          </div>
        </div>

        <Link
          to={`/attestations/${item.id}`}
          style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}
        >
          View details →
        </Link>
      </article>
    </li>
  );
})

// ─── Page ─────────────────────────────────────────────────────────────────

function getUpcomingOccurrences(rule: ScheduleRule, count: number) {
  const now = new Date()
  return generateOccurrences(rule, {
    fromDate: getDateInTimeZone(now, rule.timeZone),
    after: now.toISOString(),
    count,
  })
}

function AttestationScheduleView() {
  const schedules = useSchedules()
  const [editingRule, setEditingRule] = useState<ScheduleRule | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const scheduledDates = useMemo(
    () =>
      schedules.flatMap((rule) =>
        getUpcomingOccurrences(rule, 10).map(({ date }) => date),
      ),
    [schedules],
  )

  const upcomingRuns = useMemo(
    () =>
      schedules
        .flatMap((rule) =>
          getUpcomingOccurrences(rule, 5).map((occurrence) => ({ rule, occurrence })),
        )
        .sort((a, b) => a.occurrence.scheduledAt.localeCompare(b.occurrence.scheduledAt))
        .slice(0, 10),
    [schedules],
  )

  function saveRule(rule: Parameters<typeof scheduleStore.add>[0]) {
    if (editingRule) {
      scheduleStore.update(editingRule.id, rule)
      setEditingRule(null)
    } else {
      scheduleStore.add(rule)
    }
  }

  function deleteRule(rule: ScheduleRule) {
    scheduleStore.remove(rule.id)
    if (editingRule?.id === rule.id) setEditingRule(null)
    setAnnouncement('Attestation schedule deleted.')
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
      <AttestationCalendar
        key={editingRule?.id ?? 'new-schedule'}
        scheduledDates={scheduledDates}
        initialRule={editingRule ?? undefined}
        onSave={saveRule}
        onCancelEdit={() => setEditingRule(null)}
      />

      <section
        aria-label="Saved attestation schedules"
        style={{
          padding: 'var(--density-padding)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Upcoming runs</h2>
        {upcomingRuns.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No schedules saved yet.</p>
        ) : (
          <ol style={{ display: 'grid', gap: '0.65rem', paddingLeft: '1.25rem' }}>
            {upcomingRuns.map(({ rule, occurrence }) => (
              <li key={`${rule.id}-${occurrence.scheduledAt}`}>
                <time dateTime={occurrence.scheduledAt}>
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: rule.timeZone,
                  }).format(new Date(occurrence.scheduledAt))}
                </time>
                {' — '}
                {rule.cadence} schedule ({rule.timeZone})
              </li>
            ))}
          </ol>
        )}

        {schedules.length > 0 && (
          <div style={{ display: 'grid', gap: '0.65rem', marginTop: '1rem' }}>
            {schedules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '0.75rem',
                }}
              >
                <span>
                  {rule.cadence} from {rule.startDate} at {rule.localTime} ({rule.timeZone})
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setEditingRule(rule)}>Edit</button>
                  <button type="button" onClick={() => deleteRule(rule)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

export default function Attestations() {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { list: attestations, trigger } = useAttestations()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeView, setActiveView] = useState<'overview' | 'schedule'>('overview')

  const filters = useMemo(() => parseFilterState(searchParams), [searchParams])

  const filteredAttestations = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase()
    return attestations.filter((item) => {
      if (filters.activeChips.length > 0 && !filters.activeChips.includes(item.status)) {
        return false
      }
      if (normalizedQuery) {
        const matches =
          item.id.toLowerCase().includes(normalizedQuery) ||
          item.merkleRoot.toLowerCase().includes(normalizedQuery) ||
          item.status.toLowerCase().includes(normalizedQuery) ||
          item.source.toLowerCase().includes(normalizedQuery) ||
          item.period.toLowerCase().includes(normalizedQuery)
        if (!matches) return false
      }
      if (filters.dateFrom || filters.dateTo) {
        const dateKey = item.createdAt.slice(0, 10)
        if (filters.dateFrom && dateKey < filters.dateFrom) return false
        if (filters.dateTo && dateKey > filters.dateTo) return false
      }
      return true
    })
  }, [attestations, filters])

  const totalPages = Math.max(1, Math.ceil(filteredAttestations.length / PAGE_SIZE))
  const rawPage = Number(searchParams.get('page'))
  const currentPage =
    Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, totalPages) : 1

  const paginatedAttestations = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredAttestations.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredAttestations, currentPage])

  function setPage(nextPage: number) {
    const clamped = Math.max(1, Math.min(totalPages, nextPage))
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (clamped <= 1) next.delete('page')
        else next.set('page', String(clamped))
        return next
      },
      { replace: true },
    )
  }

  function handleOpenModal() {
    setError(null)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setIsLoading(false)
    setError(null)
  }

  async function handleConfirmAttestation() {
    setIsLoading(true)
    setError(null)

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
      setError(err instanceof Error ? err.message : 'Failed to process attestation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div style={{ maxWidth: 1040, paddingBottom: 'var(--space-touch)' }}>
        <header style={{ display: 'grid', gap: 'var(--density-row-gap)' }}>
          <h1 style={{ margin: 0 }}>Attestations</h1>
          <p
            style={{
              color: 'var(--muted)',
              margin: 0,
              lineHeight: 1.65,
              maxWidth: 78 * 10,
            }}
          >
            Revenue attestations published on Stellar. Merkle roots and metadata are stored on-chain,
            with a proof-history timeline for each run.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Attestations sections"
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            const nextView = activeView === 'overview' ? 'schedule' : 'overview'
            setActiveView(nextView)
            document.getElementById(`attestations-tab-${nextView}`)?.focus()
          }}
          style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', borderBottom: '1px solid var(--border)' }}
        >
          {(['overview', 'schedule'] as const).map((view) => (
            <button
              key={view}
              id={`attestations-tab-${view}`}
              type="button"
              role="tab"
              aria-selected={activeView === view}
              aria-controls={`attestations-panel-${view}`}
              tabIndex={activeView === view ? 0 : -1}
              onClick={() => setActiveView(view)}
              style={{
                minHeight: 44,
                padding: '0.55rem 0.9rem',
                border: 0,
                borderBottom: activeView === view ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent',
                color: activeView === view ? 'var(--text)' : 'var(--muted)',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {view === 'overview' ? 'Overview' : 'Schedule'}
            </button>
          ))}
        </div>

        <section
          id="attestations-panel-schedule"
          role="tabpanel"
          aria-labelledby="attestations-tab-schedule"
          tabIndex={0}
          hidden={activeView !== 'schedule'}
        >
          <AttestationScheduleView />
        </section>
        <section
          id="attestations-panel-overview"
          role="tabpanel"
          aria-labelledby="attestations-tab-overview"
          tabIndex={0}
          hidden={activeView !== 'overview'}
        >
          {attestations.length > 0 && <AttestationTrendChart attestations={attestations} />}

          <section aria-label="Attestation runs" style={{ marginTop: '1.5rem' }}>
          {attestations.length === 0 ? (
            <EmptyState onRunReport={handleOpenModal} />
          ) : (
            <>
              <SearchFilter
                placeholder="Search attestations by ID, Merkle root, source, or status…"
                chips={STATUS_CHIPS}
                showDateRange
                resultCount={filteredAttestations.length}
                totalCount={attestations.length}
                entityLabel="attestation"
              />

              {filteredAttestations.length === 0 ? (
                <p
                  style={{
                    marginTop: '1rem',
                    padding: 'var(--density-padding)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--muted)',
                  }}
                >
                  No attestations match the current filters.
                </p>
              ) : (
                <>
                  <ol style={{ margin: '1rem 0 0', padding: 0 }}>
                    {paginatedAttestations.map((item) => (
                      <TimelineRow key={item.id} item={item} />
                    ))}
                  </ol>

                  {totalPages > 1 && (
                    <nav
                      aria-label="Attestations pagination"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        marginTop: '1.25rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        style={{
                          minHeight: 'var(--density-touch-min)',
                          padding: '0.5rem 0.9rem',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: 'rgba(148, 163, 184, 0.08)',
                          color: 'var(--text)',
                          fontWeight: 700,
                          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage <= 1 ? 0.5 : 1,
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        style={{
                          minHeight: 'var(--density-touch-min)',
                          padding: '0.5rem 0.9rem',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: 'rgba(148, 163, 184, 0.08)',
                          color: 'var(--text)',
                          fontWeight: 700,
                          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage >= totalPages ? 0.5 : 1,
                        }}
                      >
                        Next
                      </button>
                    </nav>
                  )}
                </>
              )}
            </>
          )}
          </section>
        </section>
      </div>

      {/* Mobile FAB - triggers attestation modal */}
      <TriggerAttestationFAB
        onTrigger={handleOpenModal}
        isLoading={isLoading}
      />

      {/* Attestation confirmation modal */}
      <AttestationConfirmModal
        open={modalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmAttestation}
        isLoading={isLoading}
        error={error}
        details={DEFAULT_TRIGGER_DETAILS}
        feeInfo={MOCK_FEE_INFO}
      />
    </>
  )
}
