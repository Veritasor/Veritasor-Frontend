import { useState, useEffect, useCallback } from 'react'

export interface OfflineBannerProps {
  /** Called when user clicks Retry. Should attempt to reconnect. */
  onRetry?: () => void
}

export default function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setDismissed(false)
    }
    function handleOffline() {
      setIsOnline(false)
      setDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry()
    } else {
      // Default: attempt a lightweight fetch to re-check connectivity
      fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          setIsOnline(true)
          setDismissed(false)
        })
        .catch(() => {
          // Still offline — keep banner visible
        })
    }
  }, [onRetry])

  if (isOnline || dismissed) return null

  return (
    <div
      className="offline-banner"
      role="alert"
      aria-live="assertive"
    >
      <span className="offline-banner-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l14 14" />
          <path d="M12.5 7A6.5 6.5 0 0 1 3.05 11.5" />
          <path d="M10 4.5A9.5 9.5 0 0 1 14 8" />
          <path d="M1.5 4A12 12 0 0 1 8 2c2.4 0 4.6.8 6.4 2" />
          <path d="M8 14v.5" />
        </svg>
      </span>
      <span className="offline-banner-label">Offline</span>
      <span className="offline-banner-message">
        You're offline. Stale data is displayed. Retry to reconnect.
      </span>
      <button
        type="button"
        className="offline-banner-retry"
        onClick={handleRetry}
        aria-label="Retry connection"
      >
        Retry
      </button>
      <button
        type="button"
        className="offline-banner-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline banner"
      >
        ✕
      </button>
    </div>
  )
}
