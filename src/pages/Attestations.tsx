import { useState } from 'react'
import { Link } from 'react-router-dom'
import TriggerAttestationFAB from '../components/TriggerAttestationFAB'
import AttestationConfirmModal, { AttestationDetails, FeeInfo } from '../components/AttestationConfirmModal'
import { EmptyStateIllustration } from '../components/EmptyStateIllustrations'
import { AttestationCalendar } from '../components/scheduling/AttestationCalendar'

// ─── Types ────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────

type AttestationStatus = "pending" | "verified" | "failed";
type BatchOutcomeStatus = 'success' | 'queued' | 'failed'

type AttestationListItem = {
  id: string
  status: AttestationStatus
  createdAt: string // ISO 8601
  merkleRoot: string
}

type AttestationStatusMeta = {
  label: string
  background: string
  border: string
  text: string
  marker: string
  icon: (props: { size: number }) => JSX.Element
}

type BatchPeriod = {
  id: string
  label: string
  range: string
  records: number
}

type BatchOutcome = BatchPeriod & {
  status: BatchOutcomeStatus
  message: string
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

const BATCH_PERIODS: BatchPeriod[] = [
  {
    id: '2026-05',
    label: 'May 2026',
    range: 'May 1-31',
    records: 15420,
  },
  {
    id: '2026-04',
    label: 'April 2026',
    range: 'Apr 1-30',
    records: 14880,
  },
  {
    id: '2026-03',
    label: 'March 2026',
    range: 'Mar 1-31',
    records: 16110,
  },
  {
    id: '2026-02',
    label: 'February 2026',
    range: 'Feb 1-28',
    records: 13290,
  },
]

const BATCH_STATUS_COPY: Record<
  BatchOutcomeStatus,
  { label: string; tone: string; background: string; border: string }
> = {
  success: {
    label: 'Success',
    tone: 'var(--success)',
    background: 'var(--success-soft)',
    border: 'rgba(52, 211, 153, 0.35)',
  },
  queued: {
    label: 'Queued',
    tone: 'var(--warning)',
    background: 'var(--warning-soft)',
    border: 'rgba(251, 191, 36, 0.35)',
  },
  failed: {
    label: 'Failed',
    tone: 'var(--danger)',
    background: 'var(--danger-soft)',
    border: 'rgba(251, 113, 133, 0.35)',
  },
}

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

// ─── Sub-components ───────────────────────────────────────────────────────

function createBatchOutcomes(periodIds: string[]): BatchOutcome[] {
  return periodIds
    .map((periodId, index) => {
      const period = BATCH_PERIODS.find((item) => item.id === periodId)
      if (!period) return null

      const status: BatchOutcomeStatus =
        index === 1 ? 'queued' : index === periodIds.length - 1 ? 'failed' : 'success'

      const message =
        status === 'success'
          ? 'Published to Stellar and ready for review.'
          : status === 'queued'
            ? 'Queued behind the current verifier window.'
            : 'Source reconciliation timed out. Re-run is available.'

      return {
        ...period,
        status,
        message,
      }
    })
    .filter((item): item is BatchOutcome => item !== null)
}

function summarizeBatch(outcomes: BatchOutcome[]) {
  return outcomes.reduce(
    (summary, item) => {
      summary[item.status] += 1
      return summary
    },
    { success: 0, queued: 0, failed: 0 } as Record<BatchOutcomeStatus, number>,
  )
}

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

function EmptyState() {
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
          <Link
            to="/"
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
              textDecoration: "none",
              minHeight: "3rem",
            }}
          >
            Run a revenue report
          </Link>
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

function TimelineRow({ item }: { item: AttestationListItem }) {
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
            gridTemplateColumns: "minmax(140px, 220px) minmax(0, 1fr)",
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
}

// ─── Page ─────────────────────────────────────────────────────────────────

function BatchOutcomeBadge({ status }: { status: BatchOutcomeStatus }) {
  const meta = BATCH_STATUS_COPY[status]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: 'var(--density-badge-padding)',
        borderRadius: 999,
        border: `1px solid ${meta.border}`,
        background: meta.background,
        color: meta.tone,
        fontSize: 'var(--density-badge-font)',
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: meta.tone,
        }}
      />
      {meta.label}
    </span>
  )
}

function BatchAttestationPanel({
  selectedPeriodIds,
  outcomes,
  isLoading,
  onTogglePeriod,
  onTriggerBatch,
  onRerunFailed,
}: {
  selectedPeriodIds: string[]
  outcomes: BatchOutcome[]
  isLoading: boolean
  onTogglePeriod: (periodId: string) => void
  onTriggerBatch: () => void
  onRerunFailed: () => void
}) {
  const summary = summarizeBatch(outcomes)
  const failedCount = summary.failed
  const selectedCount = selectedPeriodIds.length
  const triggerDisabled = selectedCount === 0 || isLoading
  const helperId = 'batch-period-picker-help'
  const statusId = 'batch-run-status'

  return (
    <section
      aria-labelledby="batch-trigger-title"
      style={{
        marginTop: '1.5rem',
        padding: 'var(--density-padding)',
        background:
          'linear-gradient(135deg, rgba(94, 234, 212, 0.08), rgba(96, 165, 250, 0.07)), var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        display: 'grid',
        gap: 'var(--density-gap)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem', maxWidth: 680 }}>
          <p
            style={{
              margin: 0,
              color: 'var(--accent)',
              fontSize: '0.8rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Batch trigger
          </p>
          <h2 id="batch-trigger-title" style={{ margin: 0, fontSize: '1.15rem' }}>
            Select periods and run attestations together
          </h2>
          <p id={helperId} style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
            Choose one or more reporting periods. Results stay visible by period so partial
            success is clear and failed items can be retried without re-running the full batch.
          </p>
        </div>

        <div
          aria-label="Batch result summary"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(74px, 1fr))',
            gap: '0.5rem',
            minWidth: 260,
          }}
        >
          {([
            ['success', 'Success'],
            ['queued', 'Queued'],
            ['failed', 'Failed'],
          ] as const).map(([key, label]) => (
            <div
              key={key}
              style={{
                border: `1px solid ${BATCH_STATUS_COPY[key].border}`,
                background: BATCH_STATUS_COPY[key].background,
                borderRadius: 12,
                padding: '0.65rem',
                display: 'grid',
                gap: '0.2rem',
                minHeight: 70,
              }}
            >
              <span
                style={{
                  color: BATCH_STATUS_COPY[key].tone,
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {summary[key]}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 800 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--density-gap)',
          alignItems: 'start',
        }}
      >
        <fieldset
          aria-describedby={helperId}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 'var(--density-padding)',
            margin: 0,
            background: 'rgba(15, 23, 42, 0.38)',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <legend style={{ padding: '0 0.35rem', fontWeight: 900 }}>
            Reporting periods
          </legend>

          {BATCH_PERIODS.map((period) => {
            const checked = selectedPeriodIds.includes(period.id)
            return (
              <label
                key={period.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                  gap: '0.75rem',
                  alignItems: 'center',
                  minHeight: 'var(--density-touch-min)',
                  padding: '0.75rem',
                  borderRadius: 12,
                  border: `1px solid ${checked ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: checked ? 'rgba(94, 234, 212, 0.10)' : 'var(--surface-soft)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onTogglePeriod(period.id)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: 'var(--accent)',
                  }}
                />
                <span style={{ display: 'grid', gap: '0.2rem' }}>
                  <strong>{period.label}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {period.range}
                  </span>
                </span>
                <span
                  style={{
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {period.records.toLocaleString()} records
                </span>
              </label>
            )
          })}

          <button
            type="button"
            onClick={onTriggerBatch}
            disabled={triggerDisabled}
            aria-describedby={triggerDisabled && selectedCount === 0 ? 'batch-trigger-disabled-reason' : undefined}
            aria-busy={isLoading}
            style={{
              minHeight: 'var(--density-touch-min)',
              border: '1px solid transparent',
              borderRadius: 12,
              padding: '0.8rem 1rem',
              background: triggerDisabled
                ? 'rgba(148, 163, 184, 0.16)'
                : 'linear-gradient(135deg, var(--accent), #60a5fa)',
              color: triggerDisabled ? 'var(--muted)' : '#04111f',
              fontWeight: 900,
              cursor: triggerDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Starting batch...' : `Trigger ${selectedCount} period${selectedCount === 1 ? '' : 's'}`}
          </button>
          {selectedCount === 0 ? (
            <p id="batch-trigger-disabled-reason" style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
              Select at least one period to start a batch run.
            </p>
          ) : null}
        </fieldset>

        <section
          aria-labelledby="batch-results-title"
          aria-describedby={statusId}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 'var(--density-padding)',
            background: 'rgba(15, 23, 42, 0.38)',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3 id="batch-results-title" style={{ margin: 0, fontSize: '1rem' }}>
                Per-period outcome
              </h3>
              <p
                id={statusId}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}
              >
                {outcomes.length
                  ? `${summary.success} succeeded, ${summary.queued} queued, ${summary.failed} failed.`
                  : 'No batch has been triggered yet.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onRerunFailed}
              disabled={failedCount === 0 || isLoading}
              style={{
                minHeight: 'var(--density-touch-min)',
                borderRadius: 12,
                border: `1px solid ${failedCount ? 'rgba(251, 113, 133, 0.5)' : 'var(--border)'}`,
                background: failedCount ? 'var(--danger-soft)' : 'rgba(148, 163, 184, 0.10)',
                color: failedCount ? 'var(--text)' : 'var(--muted)',
                padding: '0.65rem 0.85rem',
                fontWeight: 850,
                cursor: failedCount ? 'pointer' : 'not-allowed',
              }}
            >
              Re-run failed
            </button>
          </div>

          {outcomes.length ? (
            <ul style={{ display: 'grid', gap: '0.65rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {outcomes.map((outcome) => (
                <li
                  key={outcome.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(130px, 0.7fr) auto minmax(0, 1fr)',
                    gap: '0.75rem',
                    alignItems: 'center',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '0.75rem',
                    background: 'var(--surface-soft)',
                  }}
                >
                  <div style={{ display: 'grid', gap: '0.2rem' }}>
                    <strong>{outcome.label}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                      {outcome.records.toLocaleString()} records
                    </span>
                  </div>
                  <BatchOutcomeBadge status={outcome.status} />
                  <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
                    {outcome.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div
              style={{
                minHeight: 128,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                color: 'var(--muted)',
                border: '1px dashed rgba(148, 163, 184, 0.35)',
                borderRadius: 12,
                padding: '1rem',
              }}
            >
              Batch outcomes will appear here after you trigger selected periods.
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default function Attestations() {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([
    '2026-05',
    '2026-04',
    '2026-03',
  ])
  const [batchOutcomes, setBatchOutcomes] = useState<BatchOutcome[]>([])

  const attestations: AttestationListItem[] = [
    {
      id: 'att-001',
      status: 'verified',
      createdAt: '2026-05-28T14:32:00Z',
      merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
    },
    {
      id: 'att-002',
      status: 'pending',
      createdAt: '2026-05-15T09:10:00Z',
      merkleRoot: '0x9f8e7d6c5b4a3928170605040302010f0e0d0c0b0a090807060504030201000f',
    },
  ]

  // Mock scheduled runs for calendar indicators.
  const scheduledDates = [
    '2026-05-15',
    '2026-05-28',
  ]

  // Mock attestation details (would come from API in real app)
  const mockDetails: AttestationDetails = {
    source: 'Stripe Connect API',
    period: 'May 2026',
    recordCount: 15420,
    merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
  }

  const mockFeeInfo: FeeInfo = {
    total: 2.5,
    breakdown: [
      { label: 'Network fee', amount: 0.001 },
      { label: 'Attestation service', amount: 2.499 },
    ],
  }

  function handleOpenModal() {
    setError(null)
    setModalOpen(true)
  }

  function handleTogglePeriod(periodId: string) {
    setSelectedPeriodIds((current) =>
      current.includes(periodId)
        ? current.filter((id) => id !== periodId)
        : [...current, periodId],
    )
  }

  function handleTriggerBatch() {
    setBatchOutcomes(createBatchOutcomes(selectedPeriodIds))
  }

  function handleRerunFailed() {
    setBatchOutcomes((current) =>
      current.map((outcome) =>
        outcome.status === 'failed'
          ? {
              ...outcome,
              status: 'queued',
              message: 'Re-run queued for the next verifier window.',
            }
          : outcome,
      ),
    )
  }

  function handleCloseModal() {
    setModalOpen(false)
    setIsLoading(false)
  }

  async function handleConfirmAttestation() {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock success
      console.log('Attestation confirmed and published')
      setModalOpen(false)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process attestation')
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

        <AttestationCalendar scheduledDates={scheduledDates} />

        <BatchAttestationPanel
          selectedPeriodIds={selectedPeriodIds}
          outcomes={batchOutcomes}
          isLoading={isLoading}
          onTogglePeriod={handleTogglePeriod}
          onTriggerBatch={handleTriggerBatch}
          onRerunFailed={handleRerunFailed}
        />

        <section aria-label="Attestation runs" style={{ marginTop: '1.5rem' }}>
          {attestations.length === 0 ? (
            <EmptyState />
          ) : (
            <ol style={{ margin: 0, padding: 0 }}>
              {attestations.map((item) => (
                <TimelineRow key={item.id} item={item} />
              ))}
            </ol>
          )}
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
        details={mockDetails}
        feeInfo={mockFeeInfo}
      />
    </>
  )
}
