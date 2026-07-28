/** Grouped webhook event definitions for the event picker */
export interface WebhookEventDef {
  id: string
  label: string
  description?: string
}

export interface WebhookEventGroup {
  id: string
  label: string
  events: WebhookEventDef[]
}

/** The event groups available for subscription */
export const WEBHOOK_EVENT_GROUPS: WebhookEventGroup[] = [
  {
    id: 'attestation',
    label: 'Attestation',
    events: [
      { id: 'attestation.completed', label: 'Attestation Completed', description: 'Fires when an attestation succeeds and a proof is generated.' },
      { id: 'attestation.failed', label: 'Attestation Failed', description: 'Fires when an attestation fails due to timeout or data mismatch.' },
      { id: 'attestation.started', label: 'Attestation Started', description: 'Fires when a new attestation run is initiated.' },
    ],
  },
  {
    id: 'revenue-source',
    label: 'Revenue Sources',
    events: [
      { id: 'source.connected', label: 'Source Connected', description: 'Fires when a new revenue source is connected.' },
      { id: 'source.disconnected', label: 'Source Disconnected', description: 'Fires when a revenue source is disconnected.' },
      { id: 'source.updated', label: 'Source Updated', description: 'Fires when a revenue source configuration is updated.' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    events: [
      { id: 'invoice.created', label: 'Invoice Created', description: 'Fires when a new invoice is generated.' },
      { id: 'payment.succeeded', label: 'Payment Succeeded', description: 'Fires when a payment is processed successfully.' },
      { id: 'payment.failed', label: 'Payment Failed', description: 'Fires when a payment attempt fails.' },
    ],
  },
  {
    id: 'key-management',
    label: 'Key Management',
    events: [
      { id: 'key.created', label: 'Key Created', description: 'Fires when a new API key is minted.' },
      { id: 'key.rotated', label: 'Key Rotated', description: 'Fires when an existing API key is rotated.' },
      { id: 'key.revoked', label: 'Key Revoked', description: 'Fires when an API key is permanently revoked.' },
    ],
  },
]

/** Flatten all events into a single array for search */
export const ALL_WEBHOOK_EVENTS: WebhookEventDef[] = WEBHOOK_EVENT_GROUPS.flatMap(
  (g) => g.events,
)

/** Result of URL validation */
export interface UrlValidationResult {
  valid: boolean
  error?: string
  /** Whether the URL uses HTTPS (required for production webhooks) */
  isTls?: boolean
}
