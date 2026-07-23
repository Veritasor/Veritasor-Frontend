import { Link } from 'react-router-dom'
import { AttestationCalendar } from '../components/scheduling/AttestationCalendar'
import Pagination from '../components/Pagination'
import { usePagination } from '../hooks/usePagination'
import { useIsMobile } from '../hooks/useIsMobile'

// ─── Types ────────────────────────────────────────────────────────────────

type AttestationStatus = "pending" | "verified" | "failed";

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

// ─── Mock data ────────────────────────────────────────────────────────────

/**
 * Mock data — replace with a real API call. att-001 and att-002 are the
 * canonical fixtures referenced by src/pages/Attestations.test.tsx and
 * src/test/attestation-detail.test.tsx; additional synthetic runs are
 * appended (older, descending dates) so the page has enough rows to
 * exercise pagination realistically.
 */
function buildMockAttestations(): AttestationListItem[] {
  const fixed: AttestationListItem[] = [
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

  const cycle: AttestationStatus[] = ['verified', 'verified', 'pending', 'failed']
  const synthetic: AttestationListItem[] = Array.from({ length: 22 }, (_, i) => {
    const n = i + 3
    const monthsAgo = n
    const date = new Date(Date.UTC(2026, 4 - monthsAgo, 15, 9, 10, 0))
    return {
      id: `att-${String(n).padStart(3, '0')}`,
      status: cycle[i % cycle.length],
      createdAt: date.toISOString(),
      merkleRoot: `0x${n.toString(16).padStart(4, '0')}${'a1b2c3d4e5f6'.repeat(4)}`.slice(0, 66),
    }
  })

  return [...fixed, ...synthetic]
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function Attestations() {
  const attestations = buildMockAttestations()

  // Mock scheduled runs for calendar indicators.
  const scheduledDates = [
    '2026-05-15',
    '2026-05-28',
  ]

  const isMobile = useIsMobile()
  const pagination = usePagination(attestations.length, { defaultPageSize: 10 })
  const visibleAttestations = isMobile
    ? attestations.slice(0, pagination.cumulativeEndIndex)
    : attestations.slice(pagination.startIndex, pagination.endIndex)

  return (
    <div style={{ maxWidth: 1040 }}>
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

      <section aria-label="Attestation runs" style={{ marginTop: '1.5rem' }}>
        {attestations.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ol style={{ margin: 0, padding: 0 }}>
              {visibleAttestations.map((item) => (
                <TimelineRow key={item.id} item={item} />
              ))}
            </ol>
            <Pagination
              pagination={pagination}
              totalItems={attestations.length}
              entityLabel="attestation"
            />
          </>
        )}
      </section>
    </div>
  )
}

