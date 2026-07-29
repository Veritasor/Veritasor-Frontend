/**
 * Stack, grouping, and dismissal rules for the toast notification system.
 *
 * These constants codify the UX contract documented in
 * `docs/uiux/toast-notification-system.md`. Centralising the values here means
 * the tests, the components, and the documentation stay in lock-step — change
 * a number once and every surface moves together.
 *
 * @see docs/uiux/toast-notification-system.md
 */

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error'

/** Maximum individually rendered toasts at any time (desktop ≥481px). */
export const MAX_VISIBLE_DESKTOP = 3

/**
 * Mobile portrait viewports are too short to safely stack more than a single
 * toast — anything else would obscure thumb-zone controls and the on-screen
 * keyboard.
 */
export const MAX_VISIBLE_MOBILE = 1

/** Breakpoint where the mobile stack limit kicks in. */
export const MOBILE_BREAKPOINT_QUERY = '(max-width: 480px)'

/** Auto-dismiss cadence per severity, in milliseconds. */
export const AUTO_DISMISS_MS: Record<ToastSeverity, number> = {
  success: 5000,
  info: 5000,
  warning: 0, // persist
  error: 0, // persist
}

/**
 * Toasts that carry an Undo affordance get a longer cadence so users have
 * enough time to react before the action becomes permanent. The value is only
 * applied when the underlying severity already auto-dismisses (success/info).
 * Persistent severities (warning/error) continue to persist even with undo,
 * because the message is critical.
 */
export const UNDO_EXTRA_MS = 3000

/**
 * Resolve the effective auto-dismiss duration for a toast, taking severity
 * and the optional undo affordance into account.
 *
 * Returns `0` for persistent severities (caller should treat as "no auto
 * dismiss"), otherwise the duration in milliseconds.
 */
export function resolveAutoDismissMs(
  type: ToastSeverity,
  hasUndo: boolean,
  overrideDuration?: number,
): number {
  if (overrideDuration !== undefined) return overrideDuration
  const base = AUTO_DISMISS_MS[type]
  if (base === 0) return 0
  return hasUndo ? base + UNDO_EXTRA_MS : base
}

/**
 * Split the toast list into the items that should appear individually versus
 * the items that should be collapsed into a single group summary.
 *
 * - When `items.length <= maxVisible`, every item is visible and `overflow`
 *   is empty (no group card is rendered).
 * - When `items.length > maxVisible`, the newest `maxVisible` items stay
 *   visible and the rest move into `overflow` (rendered inside the group card).
 *
 * The newest always stay visible: the user just triggered them, so they get
 * prime real estate. Older items degrade gracefully into a summary the user
 * can expand.
 */
export function splitStack<T>(items: readonly T[], maxVisible: number): {
  visible: T[]
  overflow: T[]
} {
  if (maxVisible <= 0) return { visible: [], overflow: [...items] }
  if (items.length <= maxVisible) {
    return { visible: [...items], overflow: [] }
  }
  const overflowCount = items.length - maxVisible
  return {
    visible: items.slice(overflowCount),
    overflow: items.slice(0, overflowCount),
  }
}

/** Wordy summary used by the group collapse button. */
export function describeOverflow(count: number, labelSingular: string, labelPlural: string): string {
  return count === 1 ? `${count} ${labelSingular}` : `${count} ${labelPlural}`
}
