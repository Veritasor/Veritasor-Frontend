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
  onConfirm: () => void
  isLoading?: boolean
  error?: string | null
  details?: AttestationDetails | null
  feeInfo?: FeeInfo | null
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
  const triggerRef = useRef<HTMLElement | null>(null)

  // Save the element that triggered the modal; move focus to dialog on open; restore on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      dialogRef.current!.focus()
    } else {
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
    if (!isLoading) onClose()
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

          {error && (
            <p role="alert" className="modal-error">
              {error}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-confirm"
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Attesting…' : 'Confirm & Attest'}
          </button>
        </div>
      </div>
    </div>
  )
}
