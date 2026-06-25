import { useState } from 'react'
import { useToast } from '../components/ToastContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HealthStatus = 'healthy' | 'warning' | 'error'

interface Source {
  id: string
  provider: string
  accountLabel: string
  status: HealthStatus
  lastSync: string | null
}

// ---------------------------------------------------------------------------
// Mock data — replace with real API
// ---------------------------------------------------------------------------

const INITIAL_SOURCES: Source[] = [
  { id: 'src-001', provider: 'Stripe', accountLabel: 'acct_1A2B3C4D', status: 'healthy', lastSync: '2026-06-01T14:00:00Z' },
  { id: 'src-002', provider: 'Shopify', accountLabel: 'my-store.myshopify.com', status: 'warning', lastSync: '2026-05-30T08:15:00Z' },
  { id: 'src-003', provider: 'QuickBooks', accountLabel: 'Acme Corp', status: 'error', lastSync: '2026-05-20T11:45:00Z' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_META: Record<HealthStatus, { label: string; bg: string; color: string }> = {
  healthy: { label: 'Healthy', bg: 'var(--success-soft)', color: 'var(--success)' },
  warning: { label: 'Warning', bg: 'var(--warning-soft)', color: 'var(--warning)' },
  error: { label: 'Error', bg: 'var(--danger-soft)', color: 'var(--danger)' },
}

function formatSync(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  source: Source
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ source, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(2,6,23,0.72)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--surface-strong, #0f1b30)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.75rem',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <h2 id="confirm-title" style={{ margin: 0, fontSize: '1.1rem' }}>
          Disconnect {source.provider}?
        </h2>
        <p id="confirm-desc" style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>{source.accountLabel}</strong> will be removed.
          Future attestations will not include data from this source. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={secondaryBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={dangerBtn}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared button styles
// ---------------------------------------------------------------------------

const baseBtn: React.CSSProperties = {
  padding: '0.45rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 160ms',
}

const secondaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'rgba(148,163,184,0.08)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
}

const dangerBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'var(--danger-soft)',
  borderColor: 'rgba(251,113,133,0.35)',
  color: 'var(--danger)',
}

const accentBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'rgba(94,234,212,0.08)',
  borderColor: 'rgba(94,234,212,0.3)',
  color: 'var(--accent)',
}

// ---------------------------------------------------------------------------
// SourceRow
// ---------------------------------------------------------------------------

interface SourceRowProps {
  source: Source
  onReconnect: (id: string) => void
  onDisconnect: (source: Source) => void
}

function SourceRow({ source, onReconnect, onDisconnect }: SourceRowProps) {
  const s = STATUS_META[source.status]
  return (
    <li
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.25rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {/* Provider + account */}
      <div style={{ flex: '1 1 10rem', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{source.provider}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
          {source.accountLabel}
        </div>
      </div>

      {/* Status badge */}
      <span
        aria-label={`Health status: ${s.label}`}
        style={{
          padding: '0.2rem 0.7rem',
          borderRadius: '999px',
          fontSize: '0.78rem',
          fontWeight: 700,
          background: s.bg,
          color: s.color,
          flexShrink: 0,
        }}
      >
        {s.label}
      </span>

      {/* Last sync */}
      <div style={{ color: 'var(--muted)', fontSize: '0.82rem', flexShrink: 0, minWidth: '9rem' }}>
        <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>
          Last sync
        </span>
        <time dateTime={source.lastSync ?? ''} style={{ color: 'var(--text)' }}>
          {formatSync(source.lastSync)}
        </time>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        {source.status !== 'healthy' && (
          <button
            type="button"
            aria-label={`Reconnect ${source.provider}`}
            onClick={() => onReconnect(source.id)}
            style={accentBtn}
          >
            Reconnect
          </button>
        )}
        <button
          type="button"
          aria-label={`Disconnect ${source.provider}`}
          onClick={() => onDisconnect(source)}
          style={dangerBtn}
        >
          Disconnect
        </button>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// RevenueSources
// ---------------------------------------------------------------------------

export default function RevenueSources() {
  const { addToast } = useToast()
  const [sources, setSources] = useState<Source[]>(INITIAL_SOURCES)
  const [pendingDisconnect, setPendingDisconnect] = useState<Source | null>(null)

  function handleReconnect(id: string) {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'healthy', lastSync: new Date().toISOString() } : s)),
    )
  }

  function handleDisconnectRequest(source: Source) {
    setPendingDisconnect(source)
  }

  function handleDisconnectConfirm() {
    if (!pendingDisconnect) return
    const sourceToRemove = pendingDisconnect
    setSources((prev) => prev.filter((s) => s.id !== sourceToRemove.id))
    setPendingDisconnect(null)

    addToast(
      `Disconnected ${sourceToRemove.provider}`,
      'info',
      8000,
      () => {
        setSources((prev) => {
          // Prevent duplicates if already added back
          if (prev.some((s) => s.id === sourceToRemove.id)) return prev
          return [...prev, sourceToRemove]
        })
        addToast(`Reconnected ${sourceToRemove.provider}`, 'success')
      },
      'Undo'
    )
  }

  return (
    <div style={{ maxWidth: '52rem' }}>
      <h1 style={{ marginTop: 0 }}>Revenue Sources</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connected integrations used to collect revenue data for attestations.
      </p>

      {sources.length === 0 ? (
        <section
          aria-label="No sources connected"
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            No revenue sources connected. Add an integration from the dashboard.
          </p>
        </section>
      ) : (
        <ul
          aria-label="Connected revenue sources"
          style={{ listStyle: 'none', margin: '2rem 0 0', padding: 0, display: 'grid', gap: '0.75rem' }}
        >
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              onReconnect={handleReconnect}
              onDisconnect={handleDisconnectRequest}
            />
          ))}
        </ul>
      )}

      {pendingDisconnect && (
        <ConfirmDialog
          source={pendingDisconnect}
          onConfirm={handleDisconnectConfirm}
          onCancel={() => setPendingDisconnect(null)}
        />
      )}
    </div>
  )
}
