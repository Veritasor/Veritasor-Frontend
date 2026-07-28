/**
 * WebhookRetryPanel
 *
 * Displays the retry history for a single failed webhook delivery, including:
 *   • Each attempt with its timestamp, HTTP status, and human-readable error
 *   • Backoff interval chip between attempts
 *   • A "Retry now" button per delivery
 *   • A final-status footer summarising the outcome
 *
 * Accessibility: WCAG 2.1 AA
 *   - Attempt list is a <ol> (ordered, meaningful sequence)
 *   - Backoff chips are aria-hidden; their value is communicated inline via
 *     screen-reader text on the following attempt
 *   - Status badges use both colour and text (dual coding)
 *   - All interactive controls have min 44 × 44 px touch targets
 *   - Sufficient contrast via --success / --warning / --danger tokens
 *
 * Design-system notes
 *   - Chip sizing mirrors KeyRow scope badges
 *   - Timeline connector lines use --border token
 */

import type { WebhookAttempt, WebhookDelivery, WebhookDeliveryStatus } from './api-keys/apiKeyTypes'

interface Props {
  delivery: WebhookDelivery
  onRetry: (deliveryId: string) => void
  isRetrying?: boolean
}

function formatBackoff(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function AttemptStatusChip({ attempt }: { attempt: WebhookAttempt }) {
  const isSuccess = attempt.statusCode !== null && attempt.statusCode >= 200 && attempt.statusCode < 300
  const isTimeout = attempt.statusCode === null

  let bg: string
  let border: string
  let color: string
  let label: string

  if (isSuccess) {
    bg = 'var(--success-soft)'
    border = 'rgba(52,211,153,0.35)'
    color = 'var(--success)'
    label = `${attempt.statusCode} OK`
  } else if (isTimeout) {
    bg = 'var(--warning-soft)'
    border = 'rgba(251,191,36,0.35)'
    color = 'var(--warning)'
    label = 'Timeout'
  } else {
    bg = 'var(--danger-soft)'
    border = 'rgba(251,113,133,0.35)'
    color = 'var(--danger)'
    label = attempt.statusCode ? `${attempt.statusCode}` : 'Error'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 'var(--density-badge-padding)',
        borderRadius: 999,
        fontSize: 'var(--density-badge-font)',
        fontWeight: 800,
        border: `1px solid ${border}`,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function BackoffChip({ seconds }: { seconds: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.2rem 0',
        color: 'var(--muted)',
        fontSize: 'var(--text-xs)',
      }}
    >
      {/* Vertical connector */}
      <div
        style={{
          width: 1,
          height: '1.25rem',
          background: 'var(--border)',
          marginLeft: '0.55rem',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.15rem 0.5rem',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'var(--surface-soft)',
          fontWeight: 600,
        }}
      >
        ⏱ Wait {formatBackoff(seconds)}
      </span>
    </div>
  )
}

function FinalStatusFooter({ delivery }: { delivery: WebhookDelivery }) {
  const status = delivery.status as WebhookDeliveryStatus
  const lastAttempt = delivery.attempts[delivery.attempts.length - 1]

  let icon: string
  let message: string
  let bg: string
  let border: string
  let color: string

  if (status === 'delivered') {
    icon = '✓'
    message = `Delivered after ${delivery.attempts.length} attempt${delivery.attempts.length === 1 ? '' : 's'}.`
    bg = 'var(--success-soft)'
    border = 'rgba(52,211,153,0.35)'
    color = 'var(--success)'
  } else if (status === 'retrying') {
    icon = '↻'
    message = `Retrying – attempt ${delivery.attempts.length} of up to 5.`
    bg = 'var(--warning-soft)'
    border = 'rgba(251,191,36,0.35)'
    color = 'var(--warning)'
  } else {
    // failed
    const errDetail = lastAttempt?.error ? ` (${lastAttempt.error})` : ''
    message = `Failed after ${delivery.attempts.length} attempt${delivery.attempts.length === 1 ? '' : 's'}${errDetail}.`
    icon = '✕'
    bg = 'var(--danger-soft)'
    border = 'rgba(251,113,133,0.35)'
    color = 'var(--danger)'
  }

  return (
    <div
      role="status"
      aria-label={`Delivery outcome: ${message}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.65rem 0.9rem',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${border}`,
        background: bg,
        marginTop: '0.75rem',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '0.9rem', fontWeight: 800, color, flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ color: 'var(--text)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{message}</span>
    </div>
  )
}

export default function WebhookRetryPanel({ delivery, onRetry, isRetrying = false }: Props) {
  const canRetry = delivery.status === 'failed'

  return (
    <article
      aria-label={`Webhook delivery for ${delivery.event}`}
      style={{
        padding: '1rem 1.1rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        display: 'grid',
        gap: '0.85rem',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <code
              style={{
                fontWeight: 800,
                color: 'var(--text)',
                fontSize: 'var(--text-md)',
                background: 'var(--surface-soft)',
                padding: '0.1rem 0.45rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
              }}
            >
              {delivery.event}
            </code>
          </div>
          <div style={{ marginTop: '0.25rem', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            Triggered{' '}
            <time dateTime={delivery.triggeredAt}>{formatTimestamp(delivery.triggeredAt)}</time>
          </div>
        </div>

        {/* Retry now button (only for failed deliveries) */}
        {canRetry && (
          <button
            type="button"
            className="app-button app-button-primary"
            style={{ width: 'auto', minHeight: 44, fontSize: 'var(--text-sm)', flexShrink: 0 }}
            disabled={isRetrying}
            aria-busy={isRetrying}
            aria-label={`Retry delivery for ${delivery.event}`}
            onClick={() => onRetry(delivery.id)}
          >
            {isRetrying ? 'Retrying…' : 'Retry now'}
          </button>
        )}
      </div>

      {/* Attempt list */}
      <section aria-label="Attempt history">
        <h3
          style={{
            margin: '0 0 0.5rem',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--muted)',
          }}
        >
          Attempts
        </h3>

        <ol
          aria-label={`${delivery.attempts.length} attempt${delivery.attempts.length === 1 ? '' : 's'}`}
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          {delivery.attempts.map((attempt, idx) => {
            const isLast = idx === delivery.attempts.length - 1
            const showBackoff = !isLast && attempt.backoffSeconds != null

            return (
              <li key={attempt.attempt}>
                {/* SR hint: position in sequence */}
                <span className="sr-only">
                  Attempt {attempt.attempt}
                  {attempt.backoffSeconds != null && !isLast
                    ? `, followed by a ${formatBackoff(attempt.backoffSeconds)} backoff`
                    : ''}
                </span>

                <div
                  aria-hidden="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    padding: '0.5rem 0',
                  }}
                >
                  {/* Attempt number badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '50%',
                      background: 'var(--surface-soft)',
                      border: '1px solid var(--border)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 800,
                      color: 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    {attempt.attempt}
                  </span>

                  {/* Timestamp */}
                  <time
                    dateTime={attempt.at}
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', minWidth: 0 }}
                  >
                    {formatTimestamp(attempt.at)}
                  </time>

                  {/* Status chip */}
                  <AttemptStatusChip attempt={attempt} />

                  {/* Error message, if any */}
                  {attempt.error && !attempt.statusCode && (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--muted)',
                        fontStyle: 'italic',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '14rem',
                      }}
                      title={attempt.error}
                    >
                      {attempt.error}
                    </span>
                  )}
                </div>

                {/* Backoff chip */}
                {showBackoff && <BackoffChip seconds={attempt.backoffSeconds!} />}
              </li>
            )
          })}
        </ol>
      </section>

      {/* Final status footer */}
      <FinalStatusFooter delivery={delivery} />
    </article>
  )
}
