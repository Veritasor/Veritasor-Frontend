import { useEffect, useState, useCallback, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useToast } from './ToastContext'
import ToastItem from './ToastItem'
import ToastGroup from './ToastGroup'
import {
  MAX_VISIBLE_DESKTOP,
  MAX_VISIBLE_MOBILE,
  MOBILE_BREAKPOINT_QUERY,
  splitStack,
} from './toastRules'

function useResponsiveMaxVisible(): number {
  // Bootstrap with the desktop cap so first render is deterministic on
  // SSR / non-browser environments. The effect below syncs to the real
  // viewport width on mount and on subsequent media-query changes.
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
    setIsMobile(mql.matches)
    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }
    // Safari < 14 fallback
    mql.addListener(handler)
    return () => mql.removeListener(handler)
  }, [])

  return isMobile ? MAX_VISIBLE_MOBILE : MAX_VISIBLE_DESKTOP
}

export default function ToastContainer() {
  const { toasts, removeToast, dismissTopToast } = useToast()
  const maxVisible = useResponsiveMaxVisible()

  // Stable callback so ToastGroup's keydown closure does not invalidate on
  // every parent re-render.
  const handleRemoveAll = useCallback(
    (ids: string[]) => {
      for (const id of ids) removeToast(id)
    },
    [removeToast],
  )

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      // React's keydown bubbles; we only react here to keys that aren't being
      // handled by an inner control.
      if (event.key !== 'Escape') return
      const target = event.target as HTMLElement | null
      if (target && target.closest('.toast-group')) {
        // Group handles its own Escape via aria-keyshortcuts on the inner
        // buttons — don't double-dismiss.
        return
      }
      event.preventDefault()
      dismissTopToast()
    },
    [dismissTopToast],
  )

  if (toasts.length === 0) return null

  const { visible, overflow } = splitStack(toasts, maxVisible)

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="toast-container"
      onKeyDown={handleKeyDown}
    >
      {overflow.length > 0 && (
        <ToastGroup
          items={overflow}
          onRemove={removeToast}
          onRemoveAll={handleRemoveAll}
        />
      )}
      {visible.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
