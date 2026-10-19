import { useCallback, useRef, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useDragReorder } from '../hooks/useDragReorder'
import { useSources, sourcesStore, type Source, type HealthStatus } from '../store/sourcesStore'
import { useToast } from '../components/ToastContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_META: Record<HealthStatus, { label: string; bg: string; color: string }> = {
  healthy: { label: 'Healthy', bg: 'var(--success-soft)', color: 'var(--success)' },
  warning: { label: 'Warning', bg: 'var(--warning-soft)', color: 'var(--warning)' },
  error:   { label: 'Error',   bg: 'var(--danger-soft)',  color: 'var(--danger)'  },
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
          <button type="button" onClick={onCancel} style={secondaryBtn}>Cancel</button>
          <button type="button" onClick={onConfirm} style={dangerBtn}>Disconnect</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared button styles
// ---------------------------------------------------------------------------

const baseBtn: CSSProperties = {
  padding: '0.45rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 160ms',
}

const secondaryBtn: CSSProperties = { ...baseBtn, background: 'rgba(148,163,184,0.08)', borderColor: 'var(--border)', color: 'var(--text)' }
const dangerBtn:    CSSProperties = { ...baseBtn, background: 'var(--danger-soft)',     borderColor: 'rgba(251,113,133,0.35)',  color: 'var(--danger)'  }
const accentBtn:    CSSProperties = { ...baseBtn, background: 'rgba(94,234,212,0.08)',  borderColor: 'rgba(94,234,212,0.3)',    color: 'var(--accent)'  }

const HANDLE_SIZE = 20

// ---------------------------------------------------------------------------
// DragHandle
// ---------------------------------------------------------------------------

interface DragHandleProps {
  label: string
  isGrabbed: boolean
  onPointerDown: (e: { preventDefault(): void }) => void
  onKeyDown: (e: { key: string; preventDefault(): void }) => void
  onClick: () => void
}

function DragHandle({ label, isGrabbed, onPointerDown, onKeyDown, onClick }: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label={isGrabbed ? `Release ${label}` : `Reorder ${label}`}
      aria-pressed={isGrabbed}
      data-testid="drag-handle"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: HANDLE_SIZE + 16,
        height: HANDLE_SIZE + 16,
        padding: '0.5rem',
        background: isGrabbed ? 'rgba(94,234,212,0.15)' : 'transparent',
        border: isGrabbed ? '1px solid rgba(94,234,212,0.45)' : '1px solid transparent',
        borderRadius: '0.4rem',
        cursor: isGrabbed ? 'grabbing' : 'grab',
        color: 'var(--muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        transition: 'background 120ms, border-color 120ms, color 120ms',
      }}
    >
      <svg aria-hidden="true" width={HANDLE_SIZE} height={HANDLE_SIZE} viewBox="0 0 20 20" fill="currentColor">
        <circle cx="7" cy="5" r="1.5" />
        <circle cx="13" cy="5" r="1.5" />
        <circle cx="7" cy="10" r="1.5" />
        <circle cx="13" cy="10" r="1.5" />
        <circle cx="7" cy="15" r="1.5" />
        <circle cx="13" cy="15" r="1.5" />
      </svg>
    </button>
  )
}

// ---------------------------------------------------------------------------
// SourceRow
// ---------------------------------------------------------------------------

interface SourceRowProps {
  source: Source
  index: number
  totalCount: number
  isGrabbed: boolean
  isDropTarget: boolean
  isNew: boolean
  onReconnect: (id: string) => void
  onDisconnect: (source: Source) => void
  onPointerDown: (e: { preventDefault(): void }) => void
  onPointerEnter: () => void
  onKeyDown: (e: { key: string; preventDefault(): void }) => void
  onHandleClick: () => void
}

function SourceRow({
  source, index, totalCount, isGrabbed, isDropTarget, isNew,
  onReconnect, onDisconnect, onPointerDown, onPointerEnter, onKeyDown, onHandleClick,
}: SourceRowProps) {
  const s = STATUS_META[source.status]
  const rowRef = useRef<HTMLLIElement | null>(null)

  // Move focus to newly-added rows
  useEffect(() => {
    if (isNew) rowRef.current?.focus()
  }, [isNew])

  const rowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    background: isNew
      ? 'rgba(94,234,212,0.06)'
      : isGrabbed
        ? 'rgba(94,234,212,0.06)'
        : isDropTarget
          ? 'rgba(94,234,212,0.03)'
          : 'var(--surface)',
    border: isNew
      ? '1px solid rgba(94,234,212,0.6)'
      : isGrabbed
        ? '1px solid rgba(94,234,212,0.45)'
        : isDropTarget
          ? '2px dashed rgba(94,234,212,0.6)'
          : '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    opacity: isGrabbed ? 0.85 : 1,
    outline: 'none',
    transition: 'background 120ms, border-color 120ms, opacity 120ms',
  }

  return (
    <li
      ref={rowRef}
      role="listitem"
      aria-label={`${source.provider}, priority ${index + 1} of ${totalCount}`}
      aria-grabbed={isGrabbed || undefined}
      tabIndex={isNew ? -1 : undefined}
      data-source-id={source.id}
      onPointerEnter={onPointerEnter}
      style={rowStyle}
    >
      <DragHandle
        label={source.provider}
        isGrabbed={isGrabbed}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onClick={onHandleClick}
      />

      <div style={{ flex: '1 1 10rem', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{source.provider}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
          {source.accountLabel}
        </div>
      </div>

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

      <div style={{ color: 'var(--muted)', fontSize: '0.82rem', flexShrink: 0, minWidth: '9rem' }}>
        <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>
          Last sync
        </span>
        <time dateTime={source.lastSync ?? ''} style={{ color: 'var(--text)' }}>
          {formatSync(source.lastSync)}
        </time>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        {source.status !== 'healthy' && (
          <button type="button" aria-label={`Reconnect ${source.provider}`} onClick={() => onReconnect(source.id)} style={accentBtn}>
            Reconnect
          </button>
        )}
        <button type="button" aria-label={`Disconnect ${source.provider}`} onClick={() => onDisconnect(source)} style={dangerBtn}>
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
  const sources = useSources()
  const [pendingDisconnect, setPendingDisconnect] = useState<Source | null>(null)

  // Track which source id was just added so we can highlight + focus it
  const newSourceIdRef = useRef<string | null>(null)

  const getLabel = useCallback((s: Source) => s.provider, [])

  const {
    grabbedIndex,
    dropTargetIndex,
    announcement,
    handlePointerDown,
    handlePointerEnter,
    handlePointerUp,
    handleKeyboardGrab,
    handleKeyDown,
  } = useDragReorder(sources, sourcesStore.setAll, getLabel)

  function handleReconnect(id: string) {
    sourcesStore.update(id, { status: 'healthy', lastSync: new Date().toISOString() })
  }

  function handleDisconnectRequest(source: Source) {
    setPendingDisconnect(source)
  }

  function handleDisconnectConfirm() {
    if (!pendingDisconnect) return
    const source = pendingDisconnect
    setPendingDisconnect(null)
    sourcesStore.remove(source.id)
    addToast(
      `Disconnected ${source.provider}`,
      'info',
      8000,
      () => {
        sourcesStore.restore(source)
        addToast(`Reconnected ${source.provider}`, 'success')
      },
      'Undo',
    )
  }

  return (
    <div style={{ maxWidth: '52rem' }}>
      <h1 style={{ marginTop: 0 }}>Revenue Sources</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connected integrations used to collect revenue data for attestations.
        Drag or use the handle's keyboard controls to set attestation priority order.
      </p>

      {/* aria-live region for drag/keyboard announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="dnd-announcement"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {announcement}
      </div>

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
          <p style={{ margin: '0 0 1rem', color: 'var(--muted)' }}>
            No revenue sources connected.
          </p>
          <Link
            to="/connect-source/provider"
            className="app-button app-button-primary"
            style={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            Connect a source
          </Link>
        </section>
      ) : (
        <ul
          aria-label="Connected revenue sources"
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ listStyle: 'none', margin: '2rem 0 0', padding: 0, display: 'grid', gap: '0.75rem', touchAction: 'none' }}
        >
          {sources.map((source, index) => (
            <SourceRow
              key={source.id}
              source={source}
              index={index}
              totalCount={sources.length}
              isGrabbed={grabbedIndex === index}
              isDropTarget={dropTargetIndex === index && grabbedIndex !== null && grabbedIndex !== index}
              isNew={newSourceIdRef.current === source.id}
              onReconnect={handleReconnect}
              onDisconnect={handleDisconnectRequest}
              onPointerDown={handlePointerDown(index)}
              onPointerEnter={handlePointerEnter(index)}
              onKeyDown={handleKeyDown}
              onHandleClick={() => handleKeyboardGrab(index)}
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
