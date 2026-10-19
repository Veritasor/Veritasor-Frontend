/**
 * WebhookSecretRotationDialog
 *
 * Shows both the old and new signing secrets during a grace period,
 * with copy affordances, last-used-at timestamps, a countdown to
 * old-secret expiry, and a cancel-rotation affordance.
 *
 * Accessibility: WCAG 2.1 AA
 *   - role="dialog" + aria-modal + aria-labelledby + aria-describedby
 *   - Focus trap (Tab / Shift+Tab cycles inside)
 *   - Escape closes
 *   - Copy buttons announce result via aria-live
 *   - Countdown uses aria-live="polite" so screen readers hear updates
 *   - All touch targets ≥ 44×44 px
 */

import { useEffect, useId, useRef, useState } from 'react'

export interface RotatingSecret {
  /** Masked display value, e.g. "whsec_••••••••3f9a" */
  masked: string
  /** Full secret — only available immediately after generation */
  full: string
  /** ISO-8601 of when this secret was last used by a live webhook */
  lastUsedAt: string | null
  /** ISO-8601 deadline after which this secret stops working */
  expiresAt: string
}

export interface WebhookSecretRotationDialogProps {
  open: boolean
  /** The webhook endpoint label shown in the header */
  endpointLabel: string
  oldSecret: RotatingSecret
  newSecret: RotatingSecret
  /** Called when the user confirms they're done and wants to finalise rotation */
  onConfirm: () => void
  /** Called when the user cancels the in-progress rotation (reverts to old secret) */
  onCancelRotation: () => void
  onClose: () => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useCountdown(targetIso: string) {
  const getMs = () => new Date(targetIso).getTime() - Date.now()
  const [ms, setMs] = useState(getMs)

  useEffect(() => {
    const id = window.setInterval(() => setMs(getMs()), 1000)
    return () => clearInterval(id)
  }, [targetIso])

  const total = Math.max(0, ms)
  const hours = Math.floor(total / 3_600_000)
  const minutes = Math.floor((total % 3_600_000) / 60_000)
  const seconds = Math.floor((total % 60_000) / 1_000)
  const expired = total === 0
  return { hours, minutes, seconds, expired }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  const statusId = useId()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('error')
    } finally {
      window.setTimeout(() => setState('idle'), 2000)
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        className="wsr-copy-btn"
        aria-label={label}
        aria-describedby={statusId}
        onClick={handleCopy}
      >
        {state === 'copied' ? '✓' : state === 'error' ? '✕' : '⎘'}
      </button>
      <span
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {state === 'copied' ? 'Copied to clipboard' : state === 'error' ? 'Copy failed' : ''}
      </span>
    </span>
  )
}

function SecretRow({
  label,
  secret,
  tag,
  tagVariant,
}: {
  label: string
  secret: RotatingSecret
  tag: string
  tagVariant: 'success' | 'warning'
}) {
  return (
    <div className="wsr-secret-row">
      <div className="wsr-secret-row-header">
        <span className="wsr-secret-label">{label}</span>
        <span className={`wsr-tag wsr-tag-${tagVariant}`}>{tag}</span>
      </div>

      <div className="wsr-secret-value-wrap">
        <code className="wsr-secret-value">{secret.masked}</code>
        <CopyButton
          value={secret.full}
          label={`Copy ${label.toLowerCase()} to clipboard`}
        />
      </div>

      <div className="wsr-secret-meta">
        {secret.lastUsedAt ? (
          <>
            Last used{' '}
            <time dateTime={secret.lastUsedAt}>{formatDate(secret.lastUsedAt)}</time>
          </>
        ) : (
          <span>Not yet used</span>
        )}
      </div>
    </div>
  )
}

export default function WebhookSecretRotationDialog({
  open,
  endpointLabel,
  oldSecret,
  newSecret,
  onConfirm,
  onCancelRotation,
  onClose,
}: WebhookSecretRotationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()
  const countdown = useCountdown(oldSecret.expiresAt)

  // Focus management
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      const t = window.setTimeout(() => dialogRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    } else {
      triggerRef.current?.focus()
    }
  }, [open])

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current!.querySelectorAll<HTMLElement>(FOCUSABLE),
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const countdownText = countdown.expired
    ? 'Old secret has expired'
    : `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="modal-dialog wsr-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">
            Rotate signing secret
          </h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body wsr-body">
          <p id={descId} className="modal-description">
            Both secrets are active for{' '}
            <strong style={{ color: 'var(--text)' }}>{endpointLabel}</strong> during the grace
            period. Update your integration to use the new secret before the old one expires.
          </p>

          {/* Countdown banner */}
          <div
            className={`wsr-countdown${countdown.expired ? ' wsr-countdown-expired' : ''}`}
            role="timer"
            aria-label={`Time remaining for old secret: ${countdownText}`}
          >
            <span aria-hidden="true" className="wsr-countdown-icon">
              {countdown.expired ? '⚠' : '⏱'}
            </span>
            <span className="wsr-countdown-label">Old secret expires in</span>
            <span
              aria-live="polite"
              aria-atomic="true"
              className="wsr-countdown-value"
            >
              {countdownText}
            </span>
            <span className="wsr-countdown-deadline">
              (
              <time dateTime={oldSecret.expiresAt}>
                {formatDate(oldSecret.expiresAt)}
              </time>
              )
            </span>
          </div>

          {/* Secrets */}
          <div className="wsr-secrets">
            <SecretRow
              label="New secret"
              secret={newSecret}
              tag="Active"
              tagVariant="success"
            />
            <SecretRow
              label="Old secret"
              secret={oldSecret}
              tag="Expiring"
              tagVariant="warning"
            />
          </div>

          {/* Cancel rotation affordance */}
          <div className="wsr-cancel-row">
            <span className="wsr-cancel-hint">Changed your mind?</span>
            <button
              type="button"
              className="wsr-cancel-link"
              onClick={onCancelRotation}
              aria-label="Cancel rotation and revert to old secret"
            >
              Cancel rotation
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-confirm"
            onClick={onConfirm}
            aria-label="Confirm rotation — old secret will be invalidated immediately"
          >
            Confirm rotation
          </button>
        </div>
      </div>
    </div>
  )
}
