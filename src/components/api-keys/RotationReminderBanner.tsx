/**
 * RotationReminderBanner
 *
 * Shows an info-severity banner when an API key's rotation policy deadline is
 * approaching (within 14 days). The user can:
 *   • Rotate now  – primary CTA, opens the parent's rotate flow
 *   • Snooze once – suppresses the banner for 24 h, capped to the policy deadline
 *
 * Accessibility: WCAG 2.1 AA
 *   - role="status" with a descriptive aria-label (non-interrupting, informational)
 *   - All interactive elements have min 44 × 44 px touch targets
 *   - Focus is not stolen; the banner is purely informational
 *   - Sufficient colour contrast via design-system tokens
 *
 * Design-system notes
 *   - Uses --warning / --warning-soft / --border tokens (same as IncidentBanner)
 *   - Lead-time chip mirrors the scope badge pattern in KeyRow
 */

import { useEffect, useReducer } from 'react'
import type { ApiKey } from './apiKeyTypes'

/** Number of days before rotationDue at which the banner appears. */
const LEAD_TIME_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

interface Props {
  keyItem: ApiKey
  onRotate: (id: string) => void
  onSnooze: (id: string) => void
}

function snoozeUntil({ snoozedAt, rotationDue }: ApiKey): number {
  if (!snoozedAt || !rotationDue) return 0
  const end = Math.min(Date.parse(snoozedAt) + DAY_MS, Date.parse(rotationDue))
  return Number.isFinite(end) ? end : 0
}

/**
 * Returns true when the banner should currently be visible, i.e. the key:
 *  1. has an active status
 *  2. has a rotationDue within the lead-time window
 *  3. is not currently snoozed
 */
export function shouldShowRotationReminder(keyItem: ApiKey, now = Date.now()): boolean {
  if (keyItem.status !== 'active' || !keyItem.rotationDue) return false
  const remaining = Date.parse(keyItem.rotationDue) - now
  return remaining >= 0 && remaining <= LEAD_TIME_DAYS * DAY_MS && now >= snoozeUntil(keyItem)
}

export default function RotationReminderBanner({ keyItem, onRotate, onSnooze }: Props) {
  const [, refresh] = useReducer((version: number) => version + 1, 0)
  const snoozeEnd = keyItem.status === 'active' ? snoozeUntil(keyItem) : 0

  useEffect(() => {
    const remaining = snoozeEnd - Date.now()
    if (remaining <= 0) return
    const timer = window.setTimeout(refresh, remaining)
    return () => window.clearTimeout(timer)
  }, [snoozeEnd])

  const now = Date.now()
  if (!keyItem.rotationDue || !shouldShowRotationReminder(keyItem, now)) return null

  const days = Math.ceil((Date.parse(keyItem.rotationDue) - now) / DAY_MS)
  const isUrgent = days <= 3

  const dueLabel = new Date(keyItem.rotationDue).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })

  const urgencyChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.2rem 0.55rem',
    borderRadius: 999,
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    border: `1px solid ${isUrgent ? 'rgba(251,113,133,0.45)' : 'rgba(251,191,36,0.45)'}`,
    background: isUrgent ? 'var(--danger-soft)' : 'var(--warning-soft)',
    color: isUrgent ? 'var(--danger)' : 'var(--warning)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }

  return (
    <div
      role="status"
      aria-label={`Rotation reminder for ${keyItem.label}: ${days} day${days === 1 ? '' : 's'} until rotation is due on ${dueLabel}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        flexWrap: 'wrap',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isUrgent ? 'rgba(251,113,133,0.35)' : 'rgba(251,191,36,0.35)'}`,
        background: isUrgent ? 'var(--danger-soft)' : 'var(--warning-soft)',
        marginBottom: '0.1rem',
      }}
    >
      {/* Icon – decorative */}
      <span aria-hidden="true" style={{ fontSize: '1.05rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>
        🔑
      </span>

      {/* Message block */}
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 'var(--text-md)' }}>
            Rotation due soon
          </span>
          {/* Lead-time chip */}
          <span style={urgencyChipStyle} aria-hidden="true">
            {days <= 0 ? 'Today' : `${days}d`}
          </span>
        </div>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
          <strong style={{ color: 'var(--text)' }}>{keyItem.label}</strong> must be rotated by{' '}
          <time dateTime={keyItem.rotationDue}>{dueLabel}</time>.{' '}
          Rotating replaces the secret and invalidates the old one.
        </p>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexShrink: 0,
          alignSelf: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="app-button app-button-primary"
          style={{ width: 'auto', minHeight: 44, fontSize: 'var(--text-sm)' }}
          onClick={() => onRotate(keyItem.id)}
          aria-label={`Rotate key ${keyItem.label} now`}
        >
          Rotate now
        </button>
        <button
          type="button"
          className="app-button app-button-secondary"
          style={{ width: 'auto', minHeight: 44, fontSize: 'var(--text-sm)' }}
          onClick={() => onSnooze(keyItem.id)}
          aria-label={`Snooze rotation reminder for ${keyItem.label} for 24 hours`}
        >
          Snooze
        </button>
      </div>
    </div>
  )
}
