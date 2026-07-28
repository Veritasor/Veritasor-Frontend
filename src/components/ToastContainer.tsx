import { useEffect } from 'react'
import { useToast } from './ToastContext'
import ToastItem from './ToastItem'
import GroupedToast from './GroupedToast'

export default function ToastContainer() {
  const {
    visibleToasts,
    overflowToasts,
    removeToast,
    hasOverflow,
    dismissTopmost,
  } = useToast()

  // Global Escape handler — dismisses only the topmost (most recent) toast.
  // When the user is focusing into a stacked group, Escape clears it first.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (visibleToasts.length === 0 && overflowToasts.length === 0) return
      // Stack priority: topmost visible toast first, then overflow group.
      dismissTopmost()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dismissTopmost, visibleToasts.length, overflowToasts.length])

  const hasAny = visibleToasts.length > 0 || overflowToasts.length > 0
  if (!hasAny) return null

  // Render order: overflow group on TOP (less recent), newest visible at BOTTOM.
  // This matches the existing flex-column stacking convention so the most
  // recent action remains the most discoverable at the viewport edge.
  return (
    <div aria-live="polite" aria-atomic="false" className="toast-container" data-testid="toast-container">
      {hasOverflow && (
        <GroupedToast overflowCount={overflowToasts.length} />
      )}
      {visibleToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
