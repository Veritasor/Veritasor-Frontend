import React, { useState, useId, useCallback, useMemo, KeyboardEvent } from 'react'
import { Toast } from './ToastContext'
import { describeOverflow } from './toastRules'
import ToastItem from './ToastItem'

interface ToastGroupProps {
  /** Older toasts collapsed into a single summary card. */
  items: Toast[]
  /** Remove a single toast by id (used for undo/close inside the expanded list). */
  onRemove: (id: string) => void
  /**
   * Removes the entire group at once (e.g. when the user clears all older
   * notifications via the summary's close button).
   */
  onRemoveAll: (ids: string[]) => void
}

export const TOAST_GROUP_SUMMARY_LABEL = 'Previous notifications'
const TOAST_GROUP_SUMMARY_SINGULAR = 'previous notification'
const TOAST_GROUP_SUMMARY_PLURAL = 'previous notifications'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="toast-group-chevron-svg"
    >
      <polyline points={open ? '4,2 12,8 4,14' : '8,2 14,8 8,14'} />
    </svg>
  )
}

export default function ToastGroup({ items, onRemove, onRemoveAll }: ToastGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const regionId = useId()

  const ids = useMemo(() => items.map((item) => item.id), [items])
  const count = items.length
  const summary = useMemo(
    () => describeOverflow(count, TOAST_GROUP_SUMMARY_SINGULAR, TOAST_GROUP_SUMMARY_PLURAL),
    [count],
  )

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggle()
      }
    },
    [toggle],
  )

  // Wired to the keyboard so that `aria-keyshortcuts="Escape"` on the
  // clear-all button advertises a real shortcut per WCAG 2.1.1.
  const handleClearAllKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onRemoveAll(ids)
      }
    },
    [ids, onRemoveAll],
  )

  const handleClearAll = () => {
    onRemoveAll(ids)
  }

  const expandedLabel = isExpanded ? `Hide ${summary}` : `Show ${summary}`

  // `role="group"` is used as a structural wrapper (not a live region); we
  // deliberately do not set `aria-live` on this element because some screen
  // readers only honour it on status / alert / log roles. Pressing the
  // clear-all button or invoking Escape from focus inside the group is the
  // documented interaction; the trigger carries the `aria-expanded` state.
  return (
    <div
      className={`toast-group${isExpanded ? ' toast-group-expanded' : ''}`}
      role="group"
      aria-label={TOAST_GROUP_SUMMARY_LABEL}
    >
      <div className="toast-group-summary">
        <button
          type="button"
          className="toast-group-trigger"
          aria-expanded={isExpanded}
          aria-controls={regionId}
          onClick={toggle}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="toast-group-chevron" aria-hidden="true">
            <ChevronIcon open={isExpanded} />
          </span>
          <span className="toast-group-label" aria-hidden="true">
            {TOAST_GROUP_SUMMARY_LABEL}
          </span>
          <span className="toast-group-count" aria-hidden="true">{count}</span>
          <span className="sr-only">{TOAST_GROUP_SUMMARY_LABEL}, {expandedLabel}</span>
        </button>
        <button
          type="button"
          className="toast-close-btn toast-group-clear"
          aria-label={`Dismiss all ${summary}`}
          aria-keyshortcuts="Escape"
          onClick={handleClearAll}
          onKeyDown={handleClearAllKeyDown}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {isExpanded && (
        <div
          id={regionId}
          className="toast-group-list"
          aria-label={`${TOAST_GROUP_SUMMARY_LABEL} (expanded)`}
        >
          {items.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={onRemove}
              disableMotion
            />
          ))}
        </div>
      )}
    </div>
  )
}
