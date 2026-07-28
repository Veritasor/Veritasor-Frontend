export interface StaleDataChipProps {
  /** ISO timestamp of when data was last fetched */
  lastUpdated?: string
  /** Whether data is currently stale (e.g. offline) */
  isStale?: boolean
}

export default function StaleDataChip({ lastUpdated, isStale = false }: StaleDataChipProps) {
  if (!isStale) return null

  return (
    <span className="stale-data-chip" role="status" aria-label="Data may be outdated">
      <span className="stale-data-chip-dot" aria-hidden="true" />
      <span className="stale-data-chip-text">Stale</span>
      {lastUpdated && (
        <span className="stale-data-chip-time">
          · Updated {formatRelativeTime(lastUpdated)}
        </span>
      )}
    </span>
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
