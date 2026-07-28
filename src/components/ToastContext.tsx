import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: string
  type: ToastType
  message: string
  /** Explicit duration in ms. `undefined` falls back to severity cadence. */
  duration?: number
  onUndo?: () => void
  undoLabel?: string
}

// ---------------------------------------------------------------------------
// Stacking rules (codified for #292)
// ---------------------------------------------------------------------------

/**
 * Number of fully visible toast items rendered individually.
 * Older items roll into the grouped overflow summary.
 */
export const MAX_VISIBLE_TOASTS = 3

/**
 * When the user-visible queue exceeds this many items, the oldest
 * items collapse into a single grouped summary card.
 *
 * The threshold sits one above {@link MAX_VISIBLE_TOASTS} so the
 * first collapse happens at the *fourth* toast in the queue.
 */
export const COLLAPSE_THRESHOLD = MAX_VISIBLE_TOASTS + 1

/**
 * Default cadence per severity (ms). Toasts with `duration === undefined`
 * inherit these values.
 *
 * Undoable undo toasts on the `info` severity get a longer window so
 * users have enough time to reconsider destructive actions.
 */
export const DEFAULT_CADENCE_MS: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  warning: 0, // persist
  error: 0, // persist
}

/** Bonus duration added when an info toast exposes an undo callback. */
export const UNDO_EXTENDED_CADENCE_MS = 8000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the effective duration for a toast, accounting for severity and
 * undo-aware extensions. Exposed so tests can reason about timing without
 * duplicating the cadence table.
 */
export function resolveDuration(
  type: ToastType,
  duration: number | undefined,
  hasUndo: boolean,
): number {
  if (duration !== undefined) return Math.max(0, duration)
  const base = DEFAULT_CADENCE_MS[type]
  if (type === 'info' && hasUndo) return UNDO_EXTENDED_CADENCE_MS
  return base
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface ToastGroupSnapshot {
  /** Items currently rendered individually. */
  visible: Toast[]
  /** Items hidden behind the grouped overflow summary. */
  overflow: Toast[]
  /** Total live toasts across visible + overflow. */
  total: number
}

interface ToastContextValue {
  toasts: Toast[]
  visibleToasts: Toast[]
  overflowToasts: Toast[]
  hasOverflow: boolean
  addToast: (
    message: string,
    type: ToastType,
    duration?: number,
    onUndo?: () => void,
    undoLabel?: string,
  ) => void
  removeToast: (id: string) => void
  /** Dismiss only the most recently added (topmost) toast. */
  dismissTopmost: () => void
  /** Dismiss every toast in the queue, including collapsed overflow. */
  dismissAll: () => void
  /** Collapse every overflow toast individually (clear group). */
  clearOverflow: () => void
  /** Snapshot helper for consumers / tests. */
  snapshot: ToastGroupSnapshot
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// ID factory — keep deterministic when tests want to inspect
// ---------------------------------------------------------------------------

let toastIdCounter = 0
function nextToastId(): string {
  toastIdCounter += 1
  // Stable prefix + counter so unit tests can avoid depending on Math.random()
  // collisions; production randomness is fine but unnecessary for stacking.
  return `toast-${Date.now().toString(36)}-${toastIdCounter}`
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const dismissTopmost = useCallback(() => {
    setToasts((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  const clearOverflow = useCallback(() => {
    setToasts((prev) => prev.slice(0, MAX_VISIBLE_TOASTS))
  }, [])

  const addToast = useCallback(
    (
      message: string,
      type: ToastType,
      duration?: number,
      onUndo?: () => void,
      undoLabel?: string,
    ) => {
      const id = nextToastId()
      setToasts((prev) => [...prev, { id, message, type, duration, onUndo, undoLabel }])
    },
    [],
  )

  const { visibleToasts, overflowToasts, hasOverflow } = useMemo(() => {
    const total = toasts.length
    if (total < COLLAPSE_THRESHOLD) {
      return {
        visibleToasts: toasts,
        overflowToasts: [] as Toast[],
        hasOverflow: false,
      }
    }
    return {
      visibleToasts: toasts.slice(-MAX_VISIBLE_TOASTS),
      overflowToasts: toasts.slice(0, -MAX_VISIBLE_TOASTS),
      hasOverflow: true,
    }
  }, [toasts])

  const snapshot = useMemo<ToastGroupSnapshot>(
    () => ({
      visible: visibleToasts,
      overflow: overflowToasts,
      total: toasts.length,
    }),
    [visibleToasts, overflowToasts, toasts],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      visibleToasts,
      overflowToasts,
      hasOverflow,
      addToast,
      removeToast,
      dismissTopmost,
      dismissAll,
      clearOverflow,
      snapshot,
    }),
    [
      toasts,
      visibleToasts,
      overflowToasts,
      hasOverflow,
      addToast,
      removeToast,
      dismissTopmost,
      dismissAll,
      clearOverflow,
      snapshot,
    ],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    // Defensive fallback so isolated tests can `useToast()` without a provider.
    return {
      toasts: [],
      visibleToasts: [],
      overflowToasts: [],
      hasOverflow: false,
      addToast: () => {},
      removeToast: () => {},
      dismissTopmost: () => {},
      dismissAll: () => {},
      clearOverflow: () => {},
      snapshot: { visible: [], overflow: [], total: 0 },
    }
  }
  return context
}
