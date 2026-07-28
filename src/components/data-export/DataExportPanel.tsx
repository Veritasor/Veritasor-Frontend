import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties,
} from 'react'
import {
  FORMAT_META,
  FORMAT_SAMPLE,
  SCOPE_META,
  type ExportFormat,
  type ExportJob,
  type ExportJobStatus,
  type ExportScope,
} from './exportTypes'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORMATS: ExportFormat[] = ['csv', 'json', 'parquet', 'pdf']
const SCOPES: ExportScope[] = ['all', 'current-filter', 'last-30-days']

const STATUS_META: Record<
  ExportJobStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  queued:     { label: 'Queued',    color: 'var(--muted)',    bg: 'var(--surface-soft)',           border: 'var(--border)' },
  processing: { label: 'Preparing', color: 'var(--accent)',   bg: 'rgba(94, 234, 212, 0.12)',      border: 'var(--border-strong)' },
  ready:      { label: 'Ready',     color: 'var(--success)',  bg: 'var(--success-soft)',           border: 'rgba(52, 211, 153, 0.35)' },
  failed:     { label: 'Failed',    color: 'var(--danger)',   bg: 'var(--danger-soft)',            border: 'rgba(251, 113, 133, 0.35)' },
  expired:    { label: 'Expired',   color: 'var(--warning)',  bg: 'var(--warning-soft)',           border: 'rgba(251, 191, 36, 0.35)' },
}

const SCOPE_ESTIMATE: Record<ExportScope, string> = {
  all: '5–15 minutes',
  'current-filter': '~30 seconds',
  'last-30-days': '~2 minutes',
}

const SCOPE_RECORD_COUNT: Record<ExportScope, string> = {
  all: '50,000+ records',
  'current-filter': '~200 records',
  'last-30-days': '~4,500 records',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expiryCopy(job: ExportJob, now: number): string {
  if (job.status === 'expired' || !job.expiresAt) return 'No longer available'
  const ms = new Date(job.expiresAt).getTime() - now
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `Expires in ${days} day${days === 1 ? '' : 's'}`
  const hours = Math.max(1, Math.floor(ms / 3_600_000))
  return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`
}

function expiryChipStyle(job: ExportJob, now: number): CSSProperties {
  if (job.status === 'expired' || !job.expiresAt) {
    return { color: 'var(--muted)', background: 'var(--surface-soft)', border: '1px solid var(--border)' }
  }
  const ms = new Date(job.expiresAt).getTime() - now
  const days = ms / 86_400_000
  if (days >= 2) {
    return { color: 'var(--success)', background: 'var(--success-soft)', border: '1px solid rgba(52,211,153,0.35)' }
  }
  return { color: 'var(--warning)', background: 'var(--warning-soft)', border: '1px solid rgba(251,191,36,0.35)' }
}

let jobCounter = 0
function nextJobId() {
  jobCounter += 1
  return `export-${jobCounter}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Shared button styles
// ---------------------------------------------------------------------------

const primaryButton: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minHeight: 'var(--density-touch-min)', padding: '0.7rem 1.1rem',
  borderRadius: 12, border: '1px solid transparent', fontWeight: 800,
  cursor: 'pointer', color: '#04111f',
  background: 'linear-gradient(135deg, var(--accent), #60a5fa)',
}

const ghostButton: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minHeight: 'var(--density-touch-min)', padding: '0.7rem 1.1rem',
  borderRadius: 12, border: '1px solid var(--border)', fontWeight: 700,
  cursor: 'pointer', color: 'var(--text)', background: 'transparent',
}

const dangerGhostButton: CSSProperties = {
  ...ghostButton,
  color: 'var(--danger)',
  border: '1px solid rgba(251,113,133,0.35)',
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ExportJobStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: 'var(--density-badge-padding)', borderRadius: 999,
        border: `1px solid ${meta.border}`, background: meta.bg,
        color: meta.color, fontWeight: 700, fontSize: 'var(--density-badge-font)',
        lineHeight: 1, whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  )
}

function ProgressBar({ value, labelId }: { value: number; labelId: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-labelledby={labelId}
      style={{
        height: 8, borderRadius: 999,
        background: 'rgba(148, 163, 184, 0.18)', overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`, height: '100%', borderRadius: 999,
          background: 'linear-gradient(90deg, var(--accent), #60a5fa)',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

function LargeDatasetWarning() {
  return (
    <div
      role="alert"
      style={{
        marginTop: 'var(--density-gap)',
        padding: '0.85rem 1rem',
        borderRadius: 12,
        border: '1px solid rgba(251, 191, 36, 0.35)',
        background: 'rgba(251, 191, 36, 0.08)',
        display: 'grid',
        gap: '0.4rem',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--warning, #f59e0b)' }}>
        <svg aria-hidden={true} className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Large dataset — async delivery
      </span>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        You are exporting all attestations ({SCOPE_RECORD_COUNT.all}). This will be prepared in the
        background. Estimated time: <strong style={{ color: 'var(--text)' }}>{SCOPE_ESTIMATE.all}</strong>.
        We will notify you by email when it is ready.
      </p>
    </div>
  )
}

function ConfirmDialog({
  scope,
  format,
  notifyEmail,
  onConfirm,
  onCancel,
}: {
  scope: ExportScope
  format: ExportFormat
  notifyEmail: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-export-title"
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '90%',
          padding: '1.5rem',
          borderRadius: 20,
          border: '1px solid var(--border)',
          background: 'var(--surface-strong, #0f172a)',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <h3 id="confirm-export-title" style={{ margin: 0, fontSize: '1.1rem' }}>Confirm large export</h3>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6, fontSize: '0.9rem' }}>
          You are about to export <strong>{SCOPE_RECORD_COUNT[scope]}</strong> as <strong>{FORMAT_META[format].label}</strong>.
          Estimated time: <strong>{SCOPE_ESTIMATE[scope]}</strong>.
          {notifyEmail ? ` We'll email ${notifyEmail} when ready.` : ' Check back in the tray below.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" style={ghostButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" style={primaryButton} onClick={onConfirm}>
            Start export
          </button>
        </div>
      </div>
    </div>
  )
}

const primaryButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--density-touch-min)',
  padding: '0.7rem 1.1rem',
  borderRadius: 12,
  border: '1px solid transparent',
  fontWeight: 800,
  cursor: 'pointer',
  color: '#04111f',
  background: 'linear-gradient(135deg, var(--accent), #60a5fa)',
}

function FormatCard({
  format,
  selected,
  onSelect,
}: {
  format: ExportFormat
  selected: boolean
  onSelect: (f: ExportFormat) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const meta = FORMAT_META[format]
  const sample = FORMAT_SAMPLE[format]
  const snippetId = `snippet-${format}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sample)
    } catch {
      // clipboard API unavailable — silent fail
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <label
      style={{
        flex: '1 1 200px', minWidth: 180, display: 'grid', gap: '0.25rem',
        padding: 'var(--density-padding)', borderRadius: 12,
        border: `1px solid ${selected ? 'var(--border-strong)' : 'var(--border)'}`,
        background: selected ? 'rgba(94, 234, 212, 0.10)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {/* Radio + label row */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
        <input
          type="radio"
          name="export-format"
          value={format}
          checked={selected}
          onChange={() => onSelect(format)}
          style={{ accentColor: 'var(--accent)', width: '1.1rem', height: '1.1rem' }}
        />
        {meta.label}
        <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 'var(--density-text-sm)' }}>
          {meta.extension}
        </span>
      </span>

      {/* Description */}
      <span style={{ color: 'var(--muted)', fontSize: 'var(--density-text-sm)', lineHeight: 1.5 }}>
        {meta.description}
      </span>

      {/* Best for */}
      <span
        style={{
          color: 'var(--accent)', fontSize: 'var(--density-text-sm)',
          fontWeight: 600, marginTop: '0.1rem',
        }}
      >
        Best for: {meta.bestFor}
      </span>

      {/* Show/hide sample toggle */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={snippetId}
        onClick={(e) => { e.preventDefault(); setExpanded((v) => !v) }}
        style={{
          alignSelf: 'start', marginTop: '0.35rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--accent)', fontSize: 'var(--density-text-sm)',
          fontWeight: 700, padding: 0, textAlign: 'left',
        }}
      >
        {expanded ? 'Hide sample ↑' : 'Show sample ↓'}
      </button>

      {/* Sample snippet */}
      {expanded && (
        <div id={snippetId} className="export-snippet">
          <div className="export-snippet-header">
            <span className="export-snippet-label">{meta.label} sample</span>
            <button
              type="button"
              className="export-snippet-copy"
              onClick={(e) => { e.preventDefault(); handleCopy() }}
              aria-label={`Copy ${meta.label} sample to clipboard`}
            >
              {copied ? (
                <span aria-live="polite" aria-atomic="true">Copied!</span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="export-snippet-pre"><code>{sample}</code></pre>
        </div>
      )}
    </label>
  )
}

// ---------------------------------------------------------------------------
// DownloadsTray — #260 table with re-run confirm and expiry chips
// ---------------------------------------------------------------------------

interface DownloadsTrayProps {
  jobs: ExportJob[]
  now: number
  onDownload: (job: ExportJob) => void
  onRetry: (job: ExportJob) => void
  onFocusGenerate?: () => void
}

function DownloadsTray({
  jobs, now, onDownload, onRetry, onFocusGenerate,
}: DownloadsTrayProps) {
  // Track per-row confirm state (only for expired jobs)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const handleRerun = (job: ExportJob) => {
    if (job.status === 'expired') {
      setConfirmingId(job.id)
    } else {
      onRetry(job)
    }
  }

  const handleConfirmRerun = (job: ExportJob) => {
    setConfirmingId(null)
    onRetry(job)
  }

  return (
    <section
      aria-label="Downloads"
      style={{
        marginTop: 'var(--density-gap)', padding: 'var(--density-padding)',
        background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-lg)' }}>Downloads</h3>

      {jobs.length === 0 ? (
        /* Empty state */
        <div className="export-empty-state">
          <svg
            width="40" height="40" viewBox="0 0 40 40" fill="none"
            aria-hidden="true" focusable="false"
          >
            <circle cx="20" cy="20" r="18" stroke="var(--border-strong)" strokeWidth="1.5" />
            <path d="M20 12v10M20 28v.5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h4 className="export-empty-title">No exports yet</h4>
          <p className="export-empty-body">
            Exports you generate appear here. Files stay available until they
            expire.
          </p>
          <button
            type="button"
            style={primaryButton}
            onClick={() => onFocusGenerate?.()}
          >
            Generate your first export
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="export-table-wrap">
            <table className="export-table">
              <caption className="sr-only">Export history</caption>
              <thead>
                <tr>
                  <th scope="col">Created</th>
                  <th scope="col">Format</th>
                  <th scope="col">Size</th>
                  <th scope="col">Expires in</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const fmt = FORMAT_META[job.format]
                  const labelId = `export-${job.id}-label`
                  const isActive = job.status === 'queued' || job.status === 'processing'
                  const canRerun = job.status === 'ready' || job.status === 'expired' || job.status === 'failed'
                  const isConfirming = confirmingId === job.id

                  return (
                    <tr key={job.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 'var(--density-text-sm)' }}>
                        {formatDate(job.createdAt)}
                      </td>
                      <td id={labelId} style={{ fontWeight: 700 }}>
                        {fmt.label}
                        <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '0.3rem', fontSize: 'var(--density-text-sm)' }}>
                          {fmt.extension}
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 'var(--density-text-sm)' }}>
                        {job.fileSize ?? '—'}
                      </td>
                      <td>
                        {(job.status === 'ready' || job.status === 'expired') ? (
                          <ExpiryChip job={job} now={now} />
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 'var(--density-text-sm)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={job.status} />
                        {isActive && (
                          <div style={{ marginTop: '0.4rem', minWidth: 120 }}>
                            <ProgressBar value={job.progress} labelId={labelId} />
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {job.status === 'ready' && (
                            <button
                              type="button"
                              style={primaryButton}
                              aria-label={`Download ${fmt.label} export created ${formatDate(job.createdAt)}`}
                              onClick={() => onDownload(job)}
                            >
                              Download
                            </button>
                          )}
                          {canRerun && !isConfirming && (
                            <button
                              type="button"
                              style={ghostButton}
                              aria-label={`Re-run ${fmt.label} export`}
                              onClick={() => handleRerun(job)}
                            >
                              {job.status === 'expired' ? 'Regenerate' : 'Retry'}
                            </button>
                          )}
                          {isConfirming && (
                            <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <span style={{ fontSize: 'var(--density-text-sm)', color: 'var(--muted)' }}>
                                Confirm re-run?
                              </span>
                              <button
                                type="button"
                                style={primaryButton}
                                aria-label="Yes, regenerate this export"
                                onClick={() => handleConfirmRerun(job)}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                style={dangerGhostButton}
                                aria-label="Cancel regenerate"
                                onClick={() => setConfirmingId(null)}
                              >
                                No
                              </button>
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <ul className="export-table-mobile-cards" aria-label="Export history">
            {jobs.map((job) => {
              const fmt = FORMAT_META[job.format]
              const labelId = `export-card-${job.id}-label`
              const isActive = job.status === 'queued' || job.status === 'processing'
              const canRerun = job.status === 'ready' || job.status === 'expired' || job.status === 'failed'
              const isConfirming = confirmingId === job.id

              return (
                <li
                  key={job.id}
                  style={{
                    display: 'grid', gap: '0.6rem', padding: 'var(--density-padding)',
                    borderRadius: 12, border: '1px solid var(--border)',
                    background: 'rgba(15, 23, 42, 0.5)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span id={labelId} style={{ fontWeight: 700 }}>
                      {fmt.label} export · {SCOPE_META[job.scope].label}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>

                  {isActive && <ProgressBar value={job.progress} labelId={labelId} />}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>
                      {(job.status === 'ready' || job.status === 'expired') && (
                        <ExpiryChip job={job} now={now} />
                      )}
                      {job.status === 'processing' && (
                        <span style={{ color: 'var(--muted)', fontSize: 'var(--density-text-sm)' }}>
                          Preparing… {Math.round(job.progress)}%
                        </span>
                      )}
                      {job.status === 'queued' && (
                        <span style={{ color: 'var(--muted)', fontSize: 'var(--density-text-sm)' }}>
                          Waiting to start
                        </span>
                      )}
                      {job.status === 'failed' && (
                        <span style={{ color: 'var(--danger)', fontSize: 'var(--density-text-sm)' }}>
                          {job.error ?? 'Export failed'}
                        </span>
                      )}
                    </span>

                    <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {job.status === 'ready' && (
                        <button
                          type="button"
                          style={primaryButton}
                          aria-label={`Download ${fmt.label} export`}
                          onClick={() => onDownload(job)}
                        >
                          Download
                        </button>
                      )}
                      {canRerun && !isConfirming && (
                        <button
                          type="button"
                          style={ghostButton}
                          aria-label={`Re-run ${fmt.label} export`}
                          onClick={() => handleRerun(job)}
                        >
                          {job.status === 'expired' ? 'Regenerate' : 'Retry'}
                        </button>
                      )}
                      {isConfirming && (
                        <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ fontSize: 'var(--density-text-sm)', color: 'var(--muted)' }}>Confirm?</span>
                          <button type="button" style={primaryButton} onClick={() => handleConfirmRerun(job)}>Yes</button>
                          <button type="button" style={dangerGhostButton} onClick={() => setConfirmingId(null)}>No</button>
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// DataExportPanel
// ---------------------------------------------------------------------------

interface DataExportPanelProps {
  tickMs?: number
}

export default function DataExportPanel({ tickMs = 600 }: DataExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [scope, setScope] = useState<ExportScope>('all')
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [notifyEmail, setNotifyEmail] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const generateBtnRef = useRef<HTMLButtonElement>(null)

  const clearTimer = useCallback((id: string) => {
    const t = timers.current[id]
    if (t) { clearInterval(t); delete timers.current[id] }
  }, [])

  const runJob = useCallback(
    (id: string) => {
      clearTimer(id)
      timers.current[id] = setInterval(() => {
        setJobs((prev) =>
          prev.map((job) => {
            if (job.id !== id) return job
            if (job.status !== 'queued' && job.status !== 'processing') return job
            const nextProgress = Math.min(100, job.progress + 20)
            if (nextProgress >= 100) {
              clearTimer(id)
              const ready: ExportJob = {
                ...job,
                status: 'ready',
                progress: 100,
                fileSize: scope === 'all' ? '24 MB' : '2.4 MB',
                expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
              }
              setNow(Date.now())
              const emailSuffix = ready.notifyEmail ? ` We'll send a download link to ${ready.notifyEmail}.` : ''
              setAnnouncement(
                `${FORMAT_META[ready.format].label} export ready to download.${emailSuffix}`,
              )
              return ready
            }
            return { ...job, status: 'processing', progress: nextProgress }
          }),
        )
      }, tickMs)
    },
    [clearTimer, tickMs, scope],
  )

  useEffect(() => {
    const active = timers.current
    return () => { Object.values(active).forEach(clearInterval) }
  }, [])

  const startExport = useCallback(() => {
    const id = nextJobId()
    const job: ExportJob = {
      id,
      format,
      scope,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      fileSize: null,
      error: null,
      notifyEmail: notifyEmail || null,
    }
    setJobs((prev) => [job, ...prev])
    const emailSuffix = notifyEmail ? ` We'll notify ${notifyEmail}.` : ''
    setAnnouncement(`Preparing ${FORMAT_META[format].label} export.${emailSuffix}`)
    runJob(id)
  }, [format, scope, runJob, notifyEmail])

  const handleStartClick = useCallback(() => {
    if (scope === 'all') {
      setShowConfirm(true)
    } else {
      startExport()
    }
  }, [scope, startExport])

  const handleConfirm = useCallback(() => {
    setShowConfirm(false)
    startExport()
  }, [startExport])

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false)
  }, [])

  const handleDownload = useCallback((job: ExportJob) => {
    setAnnouncement(`Downloading ${FORMAT_META[job.format].label} export.`)
  }, [])

  const handleRetry = useCallback(
    (job: ExportJob) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: 'processing', progress: 0, error: null }
            : j,
        ),
      )
      setAnnouncement(`Regenerating ${FORMAT_META[job.format].label} export.`)
      runJob(job.id)
    },
    [runJob],
  )

  const handleFocusGenerate = useCallback(() => {
    generateBtnRef.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby="data-export-title"
      style={{
        padding: 'var(--density-padding)', background: 'var(--surface)',
        borderRadius: 16, border: '1px solid var(--border)',
      }}
    >
      <h2 id="data-export-title" style={{ margin: '0 0 0.5rem', fontSize: 'var(--text-xl)' }}>
        Export data
      </h2>
      <p style={{ margin: '0 0 var(--density-gap)', color: 'var(--muted)', lineHeight: 1.6 }}>
        Choose a format and scope. Large exports are prepared in the background —
        you can keep working and download them from the tray below when ready.
      </p>

      {/* Format picker — #261 */}
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Format</legend>
        <div style={{ display: 'flex', gap: 'var(--density-row-gap)', flexWrap: 'wrap' }}>
          {FORMATS.map((f) => (
            <FormatCard
              key={f}
              format={f}
              selected={format === f}
              onSelect={setFormat}
            />
          ))}
        </div>
      </fieldset>

      {/* Scope picker */}
      <div style={{ marginTop: 'var(--density-gap)', display: 'grid', gap: '0.5rem', maxWidth: 360 }}>
        <label htmlFor="export-scope" style={{ fontWeight: 700 }}>Scope</label>
        <select
          id="export-scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as ExportScope)}
          style={{
            minHeight: 'var(--density-touch-min)', padding: '0.6rem 0.75rem',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--surface-strong)', color: 'var(--text)',
          }}
        >
          {SCOPES.map((s) => (
            <option key={s} value={s}>{SCOPE_META[s].label}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          {SCOPE_RECORD_COUNT[scope]} · Est. {SCOPE_ESTIMATE[scope]}
        </span>
      </div>

      {/* Large-dataset warning */}
      {scope === 'all' ? <LargeDatasetWarning /> : null}

      {/* Email notification */}
      <div style={{ marginTop: 'var(--density-gap)', display: 'grid', gap: '0.5rem', maxWidth: 360 }}>
        <label htmlFor="export-email" style={{ fontWeight: 700 }}>
          Email notification <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
        </label>
        <input
          id="export-email"
          type="email"
          placeholder="you@example.com"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          style={{
            minHeight: 'var(--density-touch-min)',
            padding: '0.6rem 0.75rem',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
            color: 'var(--text)',
            fontSize: '0.9rem',
          }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Get notified when your export is ready to download.
        </span>
      </div>

      <div style={{ marginTop: 'var(--density-gap)' }}>
        <button type="button" style={primaryButton} onClick={handleStartClick}>
          Generate export
        </button>
      </div>

      {/* Confirmation dialog for large exports */}
      {showConfirm ? (
        <ConfirmDialog
          scope={scope}
          format={format}
          notifyEmail={notifyEmail}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      ) : null}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <DownloadsTray
        jobs={jobs}
        now={now}
        onDownload={handleDownload}
        onRetry={handleRetry}
        onFocusGenerate={handleFocusGenerate}
      />
    </section>
  )
}
