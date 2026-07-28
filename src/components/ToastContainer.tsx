import { MAX_VISIBLE_TOASTS, useToast } from './ToastContext'
import ToastItem from './ToastItem'
import ToastGroup from './ToastGroup'

export default function ToastContainer() {
  const { toasts, removeToast, removeToastsByIds } = useToast()

  if (toasts.length === 0) return null

  // Stacking rules:
  // - Show newest toasts first (most relevant)
  // - If total <= MAX_VISIBLE_TOASTS, render all individually
  // - If total > MAX_VISIBLE_TOASTS, render newest MAX_VISIBLE_TOASTS
  //   and collapse the overflow into a ToastGroup summary
  const visibleToasts: typeof toasts = []
  const overflowToasts: typeof toasts = []

  if (toasts.length <= MAX_VISIBLE_TOASTS) {
    // Show all, newest first (reversed for visual order)
    visibleToasts.push(...[...toasts].reverse())
  } else {
    // Newest toasts are visible, oldest are collapsed
    const reversed = [...toasts].reverse()
    visibleToasts.push(...reversed.slice(0, MAX_VISIBLE_TOASTS))
    overflowToasts.push(...reversed.slice(MAX_VISIBLE_TOASTS).reverse())
  }

  return (
    <div aria-live="polite" aria-atomic="false" className="toast-container">
      {visibleToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
      {overflowToasts.length > 0 && (
        <ToastGroup
          toasts={overflowToasts}
          onRemove={removeToast}
          onRemoveAll={removeToastsByIds}
        />
      )}
    </div>
  )
}
