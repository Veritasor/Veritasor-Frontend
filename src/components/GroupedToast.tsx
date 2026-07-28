import { useState } from 'react'
import { useToast } from './ToastContext'

export interface GroupedToastProps {
  /** Optional override for the overflow count. Defaults to context. */
  overflowCount?: number
}

/**
 * Grouped overflow summary card.
 *
 * Renders when more than {@link MAX_VISIBLE_TOASTS} toasts are queued. The
 * card exposes two actions:
 *   • "Show all" — restores the overflow items into the visible queue.
 *   • "Clear all" — dismisses every toast in the overflow.
 *
 * The grouped card is announced politely to screen readers but never uses
 * `role="alert"` so it does not interrupt active speech.
 */
export default function GroupedToast({ overflowCount }: GroupedToastProps = {}) {
  const { removeToast, overflowToasts, dismissAll } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)

  const effectiveCount = overflowCount ?? overflowToasts.length
  if (effectiveCount <= 0) return null

  const safeCount = Math.min(effectiveCount, 99)
  const label = isExpanded
    ? `Showing ${safeCount} additional notifications`
    : `${safeCount} more notification${safeCount === 1 ? '' : 's'}`

  function handleShowAll() {
    setIsExpanded(true)
    // Restore overflow toasts back into the visible queue by re-adding them
    // individually. The simplest visual approach is to clear the overflow
    // and let consumers re-trigger, but here we keep them mounted as a
    // collapsed list beneath the summary card.
  }

  function handleClearAll() {
    dismissAll()
    setIsExpanded(false)
  }

  function handleIndividuallyDismiss(id: string) {
    removeToast(id)
  }

  return (
    <div
      className={`toast toast-group ${isExpanded ? 'toast-group-expanded' : ''}`}
      role="status"
      aria-label={label}
      data-testid="toast-group-summary"
      data-count={effectiveCount}
    >
      <div className="toast-content-wrapper">
        <span className="toast-icon-container" aria-hidden="true">
          {/* Stack-of-cards glyph to signal grouping */}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            width="20"
            height="20"
            className="toast-icon toast-icon-group"
            aria-hidden="true"
          >
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v1H7a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v-1h1a2 2 0 012 2v1a3 3 0 01-3 3H7a3 3 0 01-3-3V4z" />
            <path d="M2 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8z" />
          </svg>
        </span>
        <div className="toast-message">
          <strong className="toast-group-count">{safeCount}</strong>
          <span> more notification{safeCount === 1 ? '' : 's'}</span>
        </div>

        <button
          type="button"
          className="toast-group-action-btn"
          aria-label={`Show all ${safeCount} grouped notifications`}
          aria-expanded={isExpanded}
          onClick={handleShowAll}
          data-testid="toast-group-show-all"
        >
          Show all
        </button>

        <button
          type="button"
          className="toast-close-btn"
          aria-label="Clear all grouped notifications"
          onClick={handleClearAll}
          data-testid="toast-group-clear"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <ul
          className="toast-group-list"
          aria-label={`${safeCount} grouped notifications`}
          data-testid="toast-group-list"
        >
          {overflowToasts.map((toast) => (
            <li
              key={toast.id}
              className={`toast-group-list-item toast-${toast.type}`}
              role="listitem"
            >
              <span className={`toast-group-list-type toast-${toast.type}`} aria-hidden="true">
                {toast.type}
              </span>
              <span className="toast-group-list-message">{toast.message}</span>
              <button
                type="button"
                className="toast-group-list-dismiss"
                aria-label={`Dismiss ${toast.message}`}
                onClick={() => handleIndividuallyDismiss(toast.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
