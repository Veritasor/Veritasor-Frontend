import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  FORMAT_META,
  SCOPE_META,
  type ExportFormat,
  type ExportJob,
  type ExportJobStatus,
  type ExportScope,
} from './exportTypes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORMATS: ExportFormat[] = ['csv', 'json', 'pdf']
const SCOPES: ExportScope[] = ['all', 'current-filter', 'last-30-days']

const STATUS_META: Record<
  ExportJobStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  queued: { label: 'Queued', color: 'var(--muted)', bg: 'var(--surface-soft)', border: 'var(--border)' },
  processing: { label: 'Preparing', color: 'var(--accent)', bg: 'rgba(94, 234, 212, 0.12)', border: 'var(--border-strong)' },
  ready: { label: 'Ready', color: 'var(--success)', bg: 'var(--success-soft)', border: 'rgba(52, 211, 153, 0.35)' },
  failed: { label: 'Failed', color: 'var(--danger)', bg: 'var(--danger-soft)', border: 'rgba(251, 113, 133, 0.35)' },
  expired: { label: 'Expired', color: 'var(--warning)', bg: 'var(--warning-soft)', border: 'rgba(251, 191, 36, 0.35)' },
}

/** Human-friendly expiry copy, e.g. "Expires in 6 days" / "Expired". */
function expiryCopy(job: ExportJob, now: number): string {
  if (job.status === 'expired' || !job.expiresAt) return 'No longer available'
  const ms = new Date(job.expiresAt).getTime() - now
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `Expires in ${days} day${days === 1 ? '' : 's'}`
  const hours = Math.max(1, Math.floor(ms / 3_600_000))
  return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`
}

let jobCounter = 0
function nextJobId() {
  jobCounter += 1
  return `export-${jobCounter}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ExportJobStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: 'var(--density-badge-padding)',
        borderRadius: 999,
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        color: meta.color,
        fontWeight: 700,
        fontSize: 'var(--density-badge-font)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  )
}

/** Determinate progress bar. Color and ARIA reflect the live percentage. */
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
        height: 8,
        borderRadius: 999,
        background: 'rgba(148, 163, 184, 0.18)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: 999,
          background: 'linear-gradient(90deg, var(--accent), #60a5fa)',
          transition: 'width 0.3s ease',
        }}
      />
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

const ghostButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--density-touch-min)',
  padding: '0.7rem 1.1rem',
  borderRadius: 12,
  border: '1px solid var(--border)',
  fontWeight: 700,
  cursor: 'pointer',
  color: 'var(--text)',
  background: 'transparent',
}

// ---------------------------------------------------------------------------
// DownloadsTray
// ---------------------------------------------------------------------------

interface DownloadsTrayProps {
  jobs: ExportJob[]
  now: number
  onDownload: (job: ExportJob) => void
  onRetry: (job: ExportJob) => void
}

function DownloadsTray({ jobs, now, onDownload, onRetry }: DownloadsTrayProps) {
  return (
    <section
      aria-label="Downloads"
      style={{
        marginTop: 'var(--density-gap)',
        padding: 'var(--density-padding)',
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-lg)' }}>Downloads</h3>

      {jobs.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
          Exports you generate appear here. Files stay available to re-download
          until they expire.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--density-row-gap)' }}>
          {jobs.map((job) => {
            const fmt = FORMAT_META[job.format]
            const labelId = `export-${job.id}-label`
            const isActive = job.status === 'queued' || job.status === 'processing'
            return (
              <li
                key={job.id}
                style={{
                  display: 'grid',
                  gap: '0.6rem',
                  padding: 'var(--density-padding)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'rgba(15, 23, 42, 0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span id={labelId} style={{ fontWeight: 700 }}>
                    {fmt.label} export · {SCOPE_META[job.scope].label}
                  </span>
                  <StatusBadge status={job.status} />
                </div>

                {isActive ? (
                  <ProgressBar value={job.progress} labelId={labelId} />
                ) : null}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 'var(--density-text-sm)' }}>
                    {job.status === 'ready' && (
                      <>
                        {job.fileSize ? `${job.fileSize} · ` : ''}
                        {expiryCopy(job, now)}
                      </>
                    )}
                    {job.status === 'processing' && `Preparing… ${Math.round(job.progress)}%`}
                    {job.status === 'queued' && 'Waiting to start'}
                    {job.status === 'failed' && (job.error ?? 'Export failed')}
                    {job.status === 'expired' && 'File expired — generate a fresh export'}
                  </span>

                  <span style={{ display: 'flex', gap: '0.5rem' }}>
                    {job.status === 'ready' ? (
                      <button
                        type="button"
                        style={primaryButton}
                        onClick={() => onDownload(job)}
                      >
                        Download
                      </button>
                    ) : null}
                    {(job.status === 'failed' || job.status === 'expired') ? (
                      <button
                        type="button"
                        style={ghostButton}
                        onClick={() => onRetry(job)}
                      >
                        {job.status === 'expired' ? 'Regenerate' : 'Retry'}
                      </button>
                    ) : null}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// DataExportPanel
// ---------------------------------------------------------------------------

interface DataExportPanelProps {
  /** Override the per-tick progress interval (ms). Useful for tests. */
  tickMs?: number
}

export default function DataExportPanel({ tickMs = 600 }: DataExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [scope, setScope] = useState<ExportScope>('all')
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [announcement, setAnnouncement] = useState('')
  // `now` is refreshed when jobs change so expiry copy stays roughly current
  // without an always-on timer.
  const [now, setNow] = useState(() => Date.now())

  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const clearTimer = useCallback((id: string) => {
    const t = timers.current[id]
    if (t) {
      clearInterval(t)
      delete timers.current[id]
    }
  }, [])

  // Drive a job from processing -> ready (or failed) over time.
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
                fileSize: '2.4 MB',
                expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
              }
              setNow(Date.now())
              setAnnouncement(
                `${FORMAT_META[ready.format].label} export ready to download.`,
              )
              return ready
            }
            return { ...job, status: 'processing', progress: nextProgress }
          }),
        )
      }, tickMs)
    },
    [clearTimer, tickMs],
  )

  useEffect(() => {
    const active = timers.current
    return () => {
      Object.values(active).forEach(clearInterval)
    }
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
    }
    setJobs((prev) => [job, ...prev])
    setAnnouncement(`Preparing ${FORMAT_META[format].label} export. We'll let you know when it's ready.`)
    runJob(id)
  }, [format, scope, runJob])

  const handleDownload = useCallback((job: ExportJob) => {
    setAnnouncement(`Downloading ${FORMAT_META[job.format].label} export.`)
  }, [])

  const handleRetry = useCallback(
    (job: ExportJob) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: 'processing', progress: 0, error: null } : j,
        ),
      )
      setAnnouncement(`Regenerating ${FORMAT_META[job.format].label} export.`)
      runJob(job.id)
    },
    [runJob],
  )

  return (
    <section
      aria-labelledby="data-export-title"
      style={{
        padding: 'var(--density-padding)',
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
      }}
    >
      <h2 id="data-export-title" style={{ margin: '0 0 0.5rem', fontSize: 'var(--text-xl)' }}>
        Export data
      </h2>
      <p style={{ margin: '0 0 var(--density-gap)', color: 'var(--muted)', lineHeight: 1.6 }}>
        Choose a format and scope. Large exports are prepared in the background —
        you can keep working and download them from the tray below when ready.
      </p>

      {/* Format picker */}
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Format</legend>
        <div style={{ display: 'flex', gap: 'var(--density-row-gap)', flexWrap: 'wrap' }}>
          {FORMATS.map((f) => {
            const meta = FORMAT_META[f]
            const selected = format === f
            return (
              <label
                key={f}
                style={{
                  flex: '1 1 200px',
                  minWidth: 180,
                  display: 'grid',
                  gap: '0.25rem',
                  padding: 'var(--density-padding)',
                  borderRadius: 12,
                  border: `1px solid ${selected ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: selected ? 'rgba(94, 234, 212, 0.10)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <input
                    type="radio"
                    name="export-format"
                    value={f}
                    checked={selected}
                    onChange={() => setFormat(f)}
                    style={{ accentColor: 'var(--accent)', width: '1.1rem', height: '1.1rem' }}
                  />
                  {meta.label}
                  <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 'var(--density-text-sm)' }}>
                    {meta.extension}
                  </span>
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 'var(--density-text-sm)', lineHeight: 1.5 }}>
                  {meta.description}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Scope picker */}
      <div style={{ marginTop: 'var(--density-gap)', display: 'grid', gap: '0.5rem', maxWidth: 360 }}>
        <label htmlFor="export-scope" style={{ fontWeight: 700 }}>
          Scope
        </label>
        <select
          id="export-scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as ExportScope)}
          style={{
            minHeight: 'var(--density-touch-min)',
            padding: '0.6rem 0.75rem',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
            color: 'var(--text)',
          }}
        >
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {SCOPE_META[s].label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 'var(--density-gap)' }}>
        <button type="button" style={primaryButton} onClick={startExport}>
          Generate export
        </button>
      </div>

      {/*
        Polite live region: progress and completion are announced without
        stealing focus (WCAG 4.1.3 Status Messages).
      */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <DownloadsTray jobs={jobs} now={now} onDownload={handleDownload} onRetry={handleRetry} />
    </section>
  )
}
