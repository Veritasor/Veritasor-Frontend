import { useState, useEffect, useCallback } from 'react'

export interface OnlineStatus {
  isOnline: boolean
  retry: () => void
}

/**
 * Tracks browser online/offline status via navigator.onLine and
 * the window `online`/`offline` events.
 *
 * `retry` performs a lightweight HEAD probe against the API base URL
 * to verify connectivity.  It resolves `true` if the server responds
 * with a non-error status, `false` otherwise.  The banner can use this
 * to give the user immediate feedback.
 */
export function useOnlineStatus(apiBaseUrl = ''): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const retry = useCallback(async () => {
    if (!apiBaseUrl) {
      // No endpoint configured – just check the browser flag.
      setIsOnline(navigator.onLine)
      return
    }
    try {
      const res = await fetch(apiBaseUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      setIsOnline(res.ok)
    } catch {
      setIsOnline(false)
    }
  }, [apiBaseUrl])

  return { isOnline, retry }
}
