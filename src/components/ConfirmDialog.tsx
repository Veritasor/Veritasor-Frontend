import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  tone = 'default',
  onClose,
  onConfirm,
  isLoading = false,
}: {
  open: boolean
  title: string
  description: string
  confirmText: string
  cancelText: string
  tone?: 'default' | 'danger'
  isLoading?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      dialogRef.current?.focus()
    } else {
      triggerRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = Array.from(dialogRef.current!.querySelectorAll<HTMLElement>(FOCUSABLE))
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

  const confirmStyle =
    tone === 'danger'
      ? {
          color: '#04111f',
          background: 'linear-gradient(135deg, rgba(251,113,133,1), #fb7185)',
          borderColor: 'transparent',
        }
      : undefined

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="modal-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="confirm-title" className="modal-title">
            {title}
          </h2>
          <button type="button" className="modal-close" aria-label="Close dialog" onClick={onClose}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="modal-body">
          <p id="confirm-desc" className="modal-description">
            {description}
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-confirm"
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
            style={confirmStyle}
          >
            {isLoading ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

