import { useEffect, useRef, useState } from 'react'
import type { SaveStatus } from '../hooks/useDirtyForm'

interface DirtyStateBannerProps {
  isDirty: boolean
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  onSave: () => Promise<void> | void
  onDiscard: () => void
  formLabel: string
}

const STATUS_LABELS: Record<SaveStatus, string> = {
  idle: '',
  dirty: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved',
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DirtyStateBanner({
  isDirty,
  saveStatus,
  lastSavedAt,
  onSave,
  onDiscard,
  formLabel,
}: DirtyStateBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [saveInProgress, setSaveInProgress] = useState(false)
  const [now, setNow] = useState(Date.now())
  const bannerRef = useRef<HTMLDivElement>(null)
  const announceRef = useRef<HTMLDivElement>(null)

  const visible = isDirty || saveStatus === 'saving' || saveStatus === 'saved'

  useEffect(() => {
    if (visible) setDismissed(false)
  }, [visible, isDirty])

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [lastSavedAt])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !dismissed && visible) {
        e.preventDefault()
        setDismissed(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [dismissed, visible])

  useEffect(() => {
    if (!announceRef.current) return
    if (saveStatus === 'saving') {
      announceRef.current.textContent = `${formLabel}: saving changes.`
    } else if (saveStatus === 'saved') {
      announceRef.current.textContent = `${formLabel}: changes saved successfully.`
    } else if (saveStatus === 'dirty' && isDirty) {
      announceRef.current.textContent = `${formLabel}: you have unsaved changes.`
    }
  }, [saveStatus, isDirty, formLabel])

  async function handleSave() {
    setSaveInProgress(true)
    try {
      await onSave()
    } finally {
      setSaveInProgress(false)
    }
  }

  function handleDiscard() {
    onDiscard()
    setDismissed(true)
  }

  if (!visible || dismissed) {
    return (
      <div
        ref={announceRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    )
  }

  const isDirtyState = saveStatus === 'dirty' || isDirty
  const isSaving = saveStatus === 'saving' || saveInProgress
  const isSaved = saveStatus === 'saved' && !isDirty

  const tone = isSaved
    ? {
        dot: 'var(--success)',
        bg: 'var(--success-soft)',
        border: 'rgba(52, 211, 153, 0.35)',
        text: 'var(--success)',
      }
    : isSaving
      ? {
          dot: 'var(--accent)',
          bg: 'rgba(94, 234, 212, 0.12)',
          border: 'rgba(94, 234, 212, 0.35)',
          text: 'var(--accent)',
        }
      : {
          dot: 'var(--warning)',
          bg: 'var(--warning-soft)',
          border: 'rgba(251, 191, 36, 0.35)',
          text: 'var(--warning)',
        }

  return (
    <>
      <div
        ref={announceRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={bannerRef}
        role="region"
        aria-label={`${formLabel} save status`}
        className="dirty-state-banner"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: 'var(--radius-sm)',
          background: tone.bg,
          border: `1px solid ${tone.border}`,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(2, 6, 23, 0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          <span
            role="status"
            aria-label={STATUS_LABELS[saveStatus]}
            style={{
              width: '0.55rem',
              height: '0.55rem',
              borderRadius: '50%',
              background: tone.dot,
              flexShrink: 0,
              boxShadow: isSaving
                ? `0 0 0 3px ${tone.bg}, 0 0 0 4px ${tone.border}`
                : isDirtyState
                  ? `0 0 0 4px ${tone.bg}`
                  : 'none',
              animation: isSaving ? 'dirty-banner-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: tone.text,
            }}
          >
            {STATUS_LABELS[saveStatus]}
          </span>
          {lastSavedAt && !isDirtyState && (
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--muted)',
              }}
            >
              <span className="sr-only">Last saved </span>
              <span aria-hidden="true">·</span>
              <span style={{ marginLeft: '0.3rem' }}>
                {(() => {
                  const d = new Date(lastSavedAt.getTime())
                  d.getTime()
                  return formatRelativeTime(new Date(lastSavedAt.getTime() + (Date.now() - now)))
                })()}
              </span>
            </span>
          )}
          {isDirtyState && (
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--muted)',
              }}
            >
              <span aria-hidden="true">·</span>
              <span style={{ marginLeft: '0.3rem' }}>Draft auto-saved locally</span>
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {isDirtyState && (
            <>
              <button
                type="button"
                onClick={handleDiscard}
                aria-label={`Discard unsaved changes in ${formLabel}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '2.25rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 120ms, border-color 120ms',
                }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                aria-busy={isSaving}
                aria-label={`Save changes in ${formLabel}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '2.25rem',
                  padding: '0.4rem 1rem',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#04111f',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isSaving ? 'wait' : 'pointer',
                  transition: 'opacity 120ms',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? 'Saving…' : 'Save now'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={`Dismiss ${formLabel} save status banner`}
            title="Press Escape to dismiss"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '2.25rem',
              minHeight: '2.25rem',
              padding: '0.3rem',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'color 120ms, background 120ms',
            }}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dirty-banner-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.88); }
        }
      `}</style>
    </>
  )
}
