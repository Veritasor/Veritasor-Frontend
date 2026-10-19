import { useState, useCallback, useId, useRef, useEffect } from 'react'
import WebhookEventPicker from './WebhookEventPicker'
import type { UrlValidationResult } from './webhookTypes'

/**
 * Validates a webhook endpoint URL.
 *
 * Rules:
 * - Must be a valid URL with https protocol (TLS required)
 * - Must not be empty
 */
function validateUrl(url: string): UrlValidationResult {
  if (!url.trim()) {
    return { valid: false, error: 'URL is required.' }
  }

  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return {
      valid: false,
      error: 'Enter a valid URL (e.g. https://example.com/webhook).',
    }
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      isTls: false,
      error:
        parsed.protocol === 'http:'
          ? 'HTTP is not encrypted. Use HTTPS for production webhooks.'
          : 'URL must use HTTPS protocol.',
    }
  }

  return { valid: true, isTls: true }
}

interface WebhookCreateFormProps {
  /**
   * Called when the form is submitted with valid data.
   * The parent handles persistence / API call.
   */
  onSubmit: (data: {
    url: string
    description: string
    events: string[]
  }) => void
  /** Called when the user cancels / closes the form */
  onCancel?: () => void
  /** Whether the form is in a submitting state */
  isSubmitting?: boolean
}

/**
 * Webhook endpoint creation form.
 *
 * Captures:
 * - Endpoint URL (with inline TLS-required validation)
 * - Description (optional)
 * - Event subscriptions (searchable grouped picker)
 *
 * Accessibility:
 * - All inputs have associated labels
 * - Inline validation errors use `role="alert"`
 * - Focus is managed on validation errors
 *
 * Responsive:
 * - Single-column mobile, two-column grid on tablet+
 */
export default function WebhookCreateForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WebhookCreateFormProps) {
  const urlId = useId()
  const descId = useId()
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [urlTouched, setUrlTouched] = useState(false)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)

  const urlValidation = validateUrl(url)
  const showUrlError =
    (urlTouched || submitAttempted) && !urlValidation.valid

  // Focus URL input on mount
  useEffect(() => {
    urlInputRef.current?.focus()
  }, [])

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value)
      if (!urlTouched) setUrlTouched(true)
    },
    [urlTouched],
  )

  function validateForm(): boolean {
    const urlResult = validateUrl(url)
    if (!urlResult.valid) {
      setUrlTouched(true)
      urlInputRef.current?.focus()
      return false
    }

    if (selectedEvents.length === 0) {
      setEventsError('Select at least one event to subscribe to.')
      return false
    }

    setEventsError(null)
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)

    if (!validateForm()) return

    onSubmit({
      url: url.trim(),
      description: description.trim(),
      events: selectedEvents,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Create webhook endpoint"
      style={{
        display: 'grid',
        gap: '1.25rem',
        maxWidth: '44rem',
      }}
    >
      {/* ── URL input ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <label
          htmlFor={urlId}
          style={{
            fontWeight: 800,
            fontSize: 'var(--text-md)',
            color: 'var(--text)',
          }}
        >
          Endpoint URL
        </label>
        <input
          ref={urlInputRef}
          id={urlId}
          type="url"
          className={`auth-input${showUrlError ? ' auth-input-error' : ''}`}
          value={url}
          onChange={handleUrlChange}
          onBlur={() => setUrlTouched(true)}
          placeholder="https://example.com/webhook"
          required
          aria-required="true"
          aria-describedby={showUrlError ? `${urlId}-error` : undefined}
          aria-invalid={showUrlError}
          autoComplete="url"
        />

        {/* URL format / TLS error */}
        {showUrlError && (
          <div
            id={`${urlId}-error`}
            role="alert"
            style={{
              color: '#ffd7dd',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              lineHeight: 1.4,
            }}
          >
            <span aria-hidden="true">&#x26A0;</span>
            {urlValidation.error}
          </div>
        )}

        {/* Submission hint for TLS */}
        {!urlValidation.valid && url.trim().length === 0 && submitAttempted && (
          <div
            role="status"
            style={{
              color: 'var(--muted)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
            }}
          >
            All webhook endpoints must use HTTPS (TLS).
          </div>
        )}
      </div>

      {/* ── Description input ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <label
          htmlFor={descId}
          style={{
            fontWeight: 800,
            fontSize: 'var(--text-md)',
            color: 'var(--text)',
          }}
        >
          Description
          <span
            style={{
              color: 'var(--muted)',
              fontWeight: 400,
              fontSize: 'var(--text-sm)',
              marginLeft: '0.35rem',
            }}
          >
            (optional)
          </span>
        </label>
        <input
          id={descId}
          type="text"
          className="auth-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Notify our CI pipeline of new attestations"
          aria-label="Webhook description"
        />
      </div>

      {/* ── Event picker ──────────────────────────────────────────────── */}
      <WebhookEventPicker
        selected={selectedEvents}
        onChange={(events) => {
          setSelectedEvents(events)
          if (events.length > 0) setEventsError(null)
        }}
        error={eventsError ?? undefined}
      />

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          flexWrap: 'wrap',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        {onCancel && (
          <button
            type="button"
            className="app-button app-button-secondary"
            style={{ width: 'auto' }}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="app-button app-button-primary"
          style={{ width: 'auto' }}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Creating…' : 'Create endpoint'}
        </button>
      </div>
    </form>
  )
}
