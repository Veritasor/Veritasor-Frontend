import { useState, useEffect, useCallback } from 'react'
import { request } from '../services/apiClient'

export interface OnlineStatus {
  isOnline: boolean
  retry: () => Promise<boolean>
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

  const retry = useCallback(async (): Promise<boolean> => {
    if (!apiBaseUrl) {
      // No endpoint configured – just check the browser flag.
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true
      setIsOnline(online)
      return online
    }
    try {
      await request(apiBaseUrl, {
        method: 'HEAD',
        cache: 'no-store',
        timeoutMs: 5000,
      })
      setIsOnline(true)
      setIsOnline(res.ok)
      return res.ok
    } catch {
      setIsOnline(false)
      return false
    }
  }, [apiBaseUrl])

  return { isOnline, retry }
}
