export interface StaleDataChipProps {
  /** ISO-8601 timestamp of when the data was last fetched. */
  fetchedAt?: string
  /** Additional CSS class. */
  className?: string
}

/**
 * Inline chip placed near data-fresh timestamps to indicate the data
 * may be outdated.
 *
 * Renders nothing when `fetchedAt` is not provided.
 *
 * WCAG 2.1 AA: uses `aria-label` for screen-reader context; the visual
 * "Stale" label is also sufficient for sighted users.
 */
export default function StaleDataChip({ fetchedAt, className = '' }: StaleDataChipProps) {
  if (!fetchedAt) return null

  return (
    <span
      className={`stale-data-chip ${className}`.trim()}
      role="status"
      aria-label={`Data fetched ${fetchedAt} may be outdated`}
    >
      Stale
    </span>
  )
}
