import { useEffect, useRef, useState } from 'react'

export interface AttestationDetails {
  source: string
  period: string
  recordCount: number
  merkleRoot: string
}

export interface FeeBreakdownItem {
  label: string
  amount: number
}

export interface FeeInfo {
  total: number
  breakdown: FeeBreakdownItem[]
}

export interface AttestationConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<unknown>
  isLoading?: boolean
  error?: string | null
  details?: AttestationDetails | null
  feeInfo?: FeeInfo | null
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return 'Failed to submit attestation. Please try again.'
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function AttestationConfirmModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  error = null,
  details = null,
  feeInfo = null,
}: AttestationConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)
  const pendingRef = useRef(false)
  const isMountedRef = useRef(true)
  const triggerRef = useRef<HTMLElement | null>(null)

  const pending = isLoading || isPending
  const displayError = error || internalError

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Save the element that triggered the modal; move focus to dialog on open; restore on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      dialogRef.current!.focus()
    } else {
      setInternalError(null)
      triggerRef.current?.focus()
    }
  }, [open])

  // Focus trap and Escape dismissal
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

  function handleBackdropClick() {
    if (!pending) onClose()
  }

  function handleConfirm() {
    if (pending || pendingRef.current) return
    setInternalError(null)
    try {
      const result = onConfirm()
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        pendingRef.current = true
        setIsPending(true)
        Promise.resolve(result)
          .catch((err: unknown) => {
            if (isMountedRef.current) {
              setInternalError(formatErrorMessage(err))
            }
          })
          .finally(() => {
            pendingRef.current = false
            if (isMountedRef.current) {
              setIsPending(false)
            }
          })
      }
    } catch (err: unknown) {
      setInternalError(formatErrorMessage(err))
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attest-modal-title"
        aria-describedby="attest-modal-desc"
        className="modal-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="attest-modal-title" className="modal-title">
            Confirm Revenue Attestation
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

        <div className="modal-body">
          <p id="attest-modal-desc" className="modal-description">
            Review the details below. Once confirmed, this attestation will be
            published as an immutable on-chain record on the Stellar network.
          </p>

          {details ? (
            <dl className="attest-summary" aria-label="Attestation details">
              <div className="attest-summary-row">
                <dt className="attest-summary-label">Source</dt>
                <dd className="attest-summary-value">{details.source}</dd>
              </div>
              <div className="attest-summary-row">
                <dt className="attest-summary-label">Period</dt>
                <dd className="attest-summary-value">{details.period}</dd>
              </div>
              <div className="attest-summary-row">
                <dt className="attest-summary-label">Records</dt>
                <dd className="attest-summary-value">
                  {details.recordCount.toLocaleString()} transactions
                </dd>
              </div>
              <div className="attest-summary-row">
                <dt className="attest-summary-label">Merkle root</dt>
                <dd className="attest-summary-value attest-mono">
                  {details.merkleRoot.slice(0, 18)}…
                </dd>
              </div>
            </dl>
          ) : (
            <p className="modal-placeholder" aria-live="polite" aria-busy="true">
              Loading attestation details…
            </p>
          )}

          <section className="fee-preview" aria-labelledby="fee-preview-title">
            <h3 id="fee-preview-title" className="fee-preview-title">Estimated Fee</h3>
            <div className="fee-compact">
              {feeInfo ? (
                <span>{feeInfo.total.toLocaleString()} XLM</span>
              ) : (
                <span aria-live="polite">Calculating fee…</span>
              )}
            </div>
            {feeInfo && (
  <>
    <button
      type="button"
      className="fee-toggle"
      aria-expanded={showFeeBreakdown}
      aria-controls="fee-breakdown-list"
      onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
    >
      {showFeeBreakdown ? 'Hide breakdown' : 'View breakdown'}
    </button>
    {showFeeBreakdown && (
      <ul id="fee-breakdown-list" className="fee-breakdown">
        {feeInfo.breakdown.map((item, i) => (
          <li key={i}>{item.label}: {item.amount.toLocaleString()} XLM</li>
        ))}
      </ul>
    )}
  </>
)}
          </section>

          <div className="modal-warning">
            <span aria-hidden="true" className="modal-warning-icon">⚠</span>
            <span>This action cannot be undone. Attested data is permanent on-chain.</span>
          </div>

          {displayError && (
            <p role="alert" className="modal-error">
              {displayError}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-confirm"
            onClick={handleConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? 'Attesting…' : 'Confirm & Attest'}
          </button>
        </div>
      </div>
    </div>
  )
}
