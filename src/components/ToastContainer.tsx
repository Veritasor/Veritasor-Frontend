import { useToast } from './ToastContext'
import ToastItem from './ToastItem'

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  const banners = toasts.filter(t => t.type === 'bulk-undo')
  const normalToasts = toasts.filter(t => t.type !== 'bulk-undo')

  return (
    <>
      {banners.length > 0 && (
        <div aria-live="polite" aria-atomic="false" className="banner-container">
          {banners.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>
      )}
      {normalToasts.length > 0 && (
        <div aria-live="polite" aria-atomic="false" className="toast-container">
          {normalToasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>
      )}
    </>
  )
}
