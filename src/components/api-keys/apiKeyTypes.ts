export type ApiKeyStatus = 'active' | 'expired' | 'revoked'

export interface ApiKey {
  id: string
  label: string
  status: ApiKeyStatus
  createdAt: string
  expiresAt: string
  scopes: string[]
  maskedKey: string
  /**
   * ISO-8601 date after which this key must be rotated.
   * When set, a reminder banner is shown 14 days before this date.
   */
  rotationDue?: string
  /**
   * ISO-8601 timestamp of when a snooze was last applied.
   * Snooze suppresses the reminder banner for 24 h (capped to rotationDue).
   */
  snoozedAt?: string
}

export interface DependentUsage {
  /** Human-readable integration name, e.g. "Stripe webhook" */
  name: string
  /** ISO-8601 timestamp of the most recent detected request */
  lastSeenAt: string
}

export type WebhookDeliveryStatus = 'delivered' | 'failed' | 'retrying'

export interface WebhookAttempt {
  /** Attempt index, 1-based */
  attempt: number
  /** ISO-8601 timestamp of this attempt */
  at: string
  /** HTTP status code returned, or null if the request never reached the server */
  statusCode: number | null
  /** Human-readable error, e.g. "Connection refused" */
  error?: string
  /** Backoff duration in seconds before the next attempt */
  backoffSeconds?: number
}

export interface WebhookDelivery {
  id: string
  /** Webhook event type, e.g. "attestation.completed" */
  event: string
  /** ISO-8601 timestamp of when the event was originally fired */
  triggeredAt: string
  status: WebhookDeliveryStatus
  attempts: WebhookAttempt[]
}

