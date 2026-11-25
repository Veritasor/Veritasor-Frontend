import { useState } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export interface OfflineBannerProps {
  /** Override API base URL for the retry probe. */
  apiBaseUrl?: string
  /** Whether any visible data on the page may be stale. */
  hasStaleData?: boolean
}

/**
 * Slim persistent banner displayed when the browser is offline.
 *
 * - Uses `role="status"` so screen-readers announce it without interrupting.
 * - The retry button triggers a HEAD probe; on success the banner disappears.
 * - A stale-data chip is shown when `hasStaleData` is true so users know
 *   the displayed information may be outdated.
 *
 * WCAG 2.1 AA notes:
 * - Contrast ratio ≥ 4.5:1 for all text (uses --warning on --surface).
 * - Focus ring on the retry button is visible in both light and dark themes.
 * - `aria-live="polite"` on the status region ensures non-intrusive updates.
 */
export default function OfflineBanner({
  apiBaseUrl = '',
  hasStaleData = false,
}: OfflineBannerProps) {
  const { isOnline, retry } = useOnlineStatus(apiBaseUrl)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryFeedback, setRetryFeedback] = useState<'success' | 'failure' | null>(null)

  async function handleRetry() {
    setIsRetrying(true)
    setRetryFeedback(null)
    try {
      const ok = await retry()
      setRetryFeedback(ok ? 'success' : 'failure')
    } catch {
      setRetryFeedback('failure')
    } finally {
      setIsRetrying(false)
    }
  }

  if (isOnline && retryFeedback !== 'success') return null

  return (
    <div
      className="offline-banner"
      role="status"
      aria-live="polite"
      aria-label={
        retryFeedback === 'success'
          ? 'Connection restored. You are back online.'
          : 'You are offline. Displayed data may be stale.'
      }
    >
      <span className="offline-banner-icon" aria-hidden="true">⚡</span>
      <span className="offline-banner-text">
        {retryFeedback === 'success'
          ? 'Connection restored — you are back online.'
          : retryFeedback === 'failure'
            ? 'Still offline — unable to reach the server.'
            : 'You are offline — showing cached data.'}
      </span>
      {!isOnline && retryFeedback !== 'success' && hasStaleData && (
        <span className="offline-banner-stale-chip" aria-label="Data may be outdated">
          Stale
        </span>
      )}
      {!isOnline && retryFeedback !== 'success' && (
        <button
          type="button"
          className="offline-banner-retry"
          onClick={handleRetry}
          disabled={isRetrying}
          aria-label="Retry connecting to the server"
        >
          {isRetrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  )
}
