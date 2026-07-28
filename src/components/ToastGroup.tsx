import React, { useState } from 'react'
import { Toast } from './ToastContext'
import ToastItem from './ToastItem'

interface ToastGroupProps {
  toasts: Toast[]
  onRemove: (id: string) => void
  onRemoveAll: (ids: string[]) => void
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  success: {
    label: 'Success',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    label: 'Info',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    label: 'Warning',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    label: 'Error',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  },
}

export default function ToastGroup({ toasts, onRemove, onRemoveAll }: ToastGroupProps) {
  const [expanded, setExpanded] = useState(false)

  if (toasts.length === 0) return null

  // Count by type
  const typeCounts = toasts.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1
    return acc
  }, {})

  const total = toasts.length
  const hasUndoable = toasts.some((t) => t.onUndo)

  function handleToggleExpand() {
    setExpanded((prev) => !prev)
  }

  function handleDismissAll() {
    onRemoveAll(toasts.map((t) => t.id))
  }

  // Build type summary chips
  const typeChips = Object.entries(typeCounts).map(([type, count]) => {
    const info = TYPE_LABELS[type]
    if (!info) return null
    return (
      <span
        key={type}
        className={`toast-group-chip toast-group-chip-${type}`}
        aria-label={`${count} ${info.label} notification${count !== 1 ? 's' : ''}`}
      >
        {info.icon}
        <span>{count}</span>
      </span>
    )
  })

  return (
    <div
      className="toast toast-group"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Collapsed summary view */}
      {!expanded && (
        <button
          type="button"
          className="toast-group-summary"
          onClick={handleToggleExpand}
          aria-expanded={false}
          aria-label={`${total} notification${total !== 1 ? 's' : ''}. Click to expand.`}
        >
          <div className="toast-group-summary-left">
            <span className="toast-group-count">{total}</span>
            <span className="toast-group-label">
              notification{total !== 1 ? 's' : ''}
            </span>
            <span className="toast-group-chips">{typeChips}</span>
          </div>

          <div className="toast-group-summary-actions">
            {hasUndoable && (
              <span className="toast-group-undo-hint">
                {toasts.filter((t) => t.onUndo).length} undoable
              </span>
            )}
            <span className="toast-group-chevron" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
        </button>
      )}

      {/* Expanded view */}
      {expanded && (
        <div className="toast-group-expanded">
          <div className="toast-group-expanded-header">
            <span className="toast-group-expanded-title">
              {total} notification{total !== 1 ? 's' : ''}
            </span>
            <div className="toast-group-expanded-actions">
              <button
                type="button"
                className="toast-group-collapse-btn"
                onClick={() => setExpanded(false)}
                aria-label="Collapse notifications"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="toast-group-items" role="list">
            {toasts.map((toast) => (
              <div key={toast.id} role="listitem" className="toast-group-item">
                <ToastItem toast={toast} onRemove={onRemove} />
              </div>
            ))}
          </div>

          <div className="toast-group-footer">
            <button
              type="button"
              className="toast-group-dismiss-all-btn"
              onClick={handleDismissAll}
            >
              Dismiss all
            </button>
            {hasUndoable && (
              <button
                type="button"
                className="toast-group-undo-all-btn"
                onClick={() => {
                  toasts.forEach((t) => {
                    if (t.onUndo) {
                      t.onUndo()
                      onRemove(t.id)
                    }
                  })
                }}
              >
                Undo all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress bars for timed toasts */}
      {!expanded && toasts.some((t) => (t.duration ?? 0) > 0) && (
        <div className="toast-group-progress" aria-hidden="true">
          <div
            className="toast-group-progress-bar"
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}
