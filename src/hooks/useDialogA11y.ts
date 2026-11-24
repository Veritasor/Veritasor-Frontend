import { useEffect, useRef, type RefObject } from 'react'

/**
 * Selector for elements that can receive keyboard focus inside a dialog.
 */
export const DIALOG_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface UseDialogA11yOptions {
  /** Whether the dialog is currently open. */
  open: boolean
  /** Element that contains the dialog's focusable content. */
  containerRef: RefObject<HTMLElement | null>
  /** Invoked when the user presses Escape (unless `disableEscape` is set). */
  onClose: () => void
  /**
   * Where focus moves when the dialog opens:
   *   - `'container'` (default): the container element itself
   *   - `'first'`: the first focusable element in the container
   *   - a ref: that element (falls back to the container)
   */
  initialFocus?: 'container' | 'first' | RefObject<HTMLElement | null>
  /** When true, Escape is swallowed but `onClose` is not called (e.g. while loading). */
  disableEscape?: boolean
  /** Restore focus to the previously focused element on close. Defaults to true. */
  returnFocus?: boolean
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR))
}

/**
 * Shared dialog accessibility behaviour:
 *   - Escape closes the dialog
 *   - Tab / Shift+Tab focus is trapped inside the container
 *   - Focus moves into the dialog on open and returns to the trigger on close
 */
export function useDialogA11y({
  open,
  containerRef,
  onClose,
  initialFocus = 'container',
  disableEscape = false,
  returnFocus = true,
}: UseDialogA11yOptions): void {
  const onCloseRef = useRef(onClose)
  const disableEscapeRef = useRef(disableEscape)
  const initialFocusRef = useRef(initialFocus)
  const returnFocusRef = useRef(returnFocus)

  useEffect(() => {
    onCloseRef.current = onClose
    disableEscapeRef.current = disableEscape
    initialFocusRef.current = initialFocus
    returnFocusRef.current = returnFocus
  })

  // Initial focus + return focus
  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const container = containerRef.current
    if (container) {
      const target = initialFocusRef.current
      let el: HTMLElement | null = null
      if (target === 'first') el = getFocusable(container)[0] ?? null
      else if (target !== 'container') el = target.current
      ;(el ?? container).focus()
    }

    return () => {
      if (returnFocusRef.current && trigger && trigger.isConnected) trigger.focus()
    }
  }, [open, containerRef])

  // Escape + focus trap
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!disableEscapeRef.current) onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return

      const focusable = getFocusable(container)
      if (focusable.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, containerRef])
}

export default useDialogA11y
