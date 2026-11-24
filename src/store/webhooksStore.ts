import { useSyncExternalStore } from 'react'
import type { WebhookAttempt, WebhookDelivery, WebhookDeliveryStatus } from '../components/api-keys/apiKeyTypes'
import type { RotatingSecret } from '../components/WebhookSecretRotationDialog'
import { newId } from '../utils/secureRandom'
import { isDuplicateWebhookUrl, validateWebhookUrl } from '../components/webhooks/webhookTypes'

export interface WebhookEndpoint {
  id: string
  url: string
  description: string
  events: string[]
  enabled: boolean
  createdAt: string
  signingSecretMasked: string
  previousSecretMasked?: string
  previousSecretExpiresAt?: string
}

export interface NewWebhookEndpoint {
  url: string
  description: string
  events: string[]
}

export interface WebhookState {
  endpoints: WebhookEndpoint[]
  deliveries: WebhookDelivery[]
}

export interface RetryResult {
  statusCode: number | null
  error?: string
}

const STORAGE_KEY = 'veritasor-webhooks-v1'
export const WEBHOOKS_SCHEMA_VERSION = 1
export const WEBHOOK_MAX_ATTEMPTS = 5
export const WEBHOOK_SECRET_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

const INITIAL_DELIVERIES: WebhookDelivery[] = [
  {
    id: 'wh_001',
    event: 'attestation.completed',
    triggeredAt: '2026-07-28T09:30:00Z',
    status: 'failed',
    attempts: [
      { attempt: 1, at: '2026-07-28T09:30:00Z', statusCode: null, error: 'Connection refused', backoffSeconds: 60 },
      { attempt: 2, at: '2026-07-28T09:31:00Z', statusCode: 503, error: 'Service Unavailable', backoffSeconds: 120 },
      { attempt: 3, at: '2026-07-28T09:33:00Z', statusCode: 500, error: 'Internal Server Error' },
    ],
  },
  {
    id: 'wh_002',
    event: 'source.connected',
    triggeredAt: '2026-07-28T08:00:00Z',
    status: 'retrying',
    attempts: [
      { attempt: 1, at: '2026-07-28T08:00:00Z', statusCode: 503, backoffSeconds: 60 },
      { attempt: 2, at: '2026-07-28T08:01:00Z', statusCode: 503, backoffSeconds: 180 },
    ],
  },
  {
    id: 'wh_003',
    event: 'attestation.failed',
    triggeredAt: '2026-07-27T18:45:00Z',
    status: 'delivered',
    attempts: [
      { attempt: 1, at: '2026-07-27T18:45:00Z', statusCode: 503, backoffSeconds: 60 },
      { attempt: 2, at: '2026-07-27T18:46:00Z', statusCode: 200 },
    ],
  },
]

const SERVER_SNAPSHOT: WebhookState = { endpoints: [], deliveries: INITIAL_DELIVERIES }

interface PersistedWebhooks extends WebhookState {
  version: number
}

interface SecretMaterial {
  current: string
  previous?: string
}

const secretMaterial = new Map<string, SecretMaterial>()
const inFlightRetries = new Set<string>()
const listeners = new Set<() => void>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEndpoint(value: unknown): value is WebhookEndpoint {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.url === 'string' &&
    validateWebhookUrl(value.url).valid &&
    typeof value.description === 'string' &&
    Array.isArray(value.events) &&
    value.events.every((event) => typeof event === 'string') &&
    typeof value.enabled === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.signingSecretMasked === 'string' &&
    (value.previousSecretMasked === undefined || typeof value.previousSecretMasked === 'string') &&
    (value.previousSecretExpiresAt === undefined || typeof value.previousSecretExpiresAt === 'string')
  )
}

function isAttempt(value: unknown): value is WebhookAttempt {
  if (!isRecord(value)) return false
  return (
    Number.isInteger(value.attempt) &&
    typeof value.at === 'string' &&
    (value.statusCode === null || (typeof value.statusCode === 'number' && Number.isInteger(value.statusCode))) &&
    (value.error === undefined || typeof value.error === 'string') &&
    (value.backoffSeconds === undefined || typeof value.backoffSeconds === 'number')
  )
}

function isDelivery(value: unknown): value is WebhookDelivery {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.event === 'string' &&
    typeof value.triggeredAt === 'string' &&
    (value.status === 'delivered' || value.status === 'failed' || value.status === 'retrying') &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isAttempt)
  )
}

function parseStored(raw: string): WebhookState {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      !isRecord(parsed) ||
      parsed.version !== WEBHOOKS_SCHEMA_VERSION ||
      !Array.isArray(parsed.endpoints) ||
      !Array.isArray(parsed.deliveries)
    ) return { endpoints: [], deliveries: INITIAL_DELIVERIES }

    return {
      endpoints: parsed.endpoints.filter(isEndpoint),
      deliveries: parsed.deliveries
        .filter(isDelivery)
        .map((delivery) => delivery.status === 'retrying'
          ? {
              ...delivery,
              status: 'failed' as const,
              attempts: delivery.attempts.map((attempt, index) =>
                index === delivery.attempts.length - 1
                  ? { ...attempt, error: 'Retry interrupted before completion.' }
                  : attempt,
              ),
            }
          : delivery),
    }
  } catch {
    return { endpoints: [], deliveries: INITIAL_DELIVERIES }
  }
}

function readStorage(): WebhookState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? { endpoints: [], deliveries: INITIAL_DELIVERIES } : parseStored(raw)
  } catch {
    return { endpoints: [], deliveries: INITIAL_DELIVERIES }
  }
}

function writeStorage(next: WebhookState): void {
  try {
    const payload: PersistedWebhooks = { version: WEBHOOKS_SCHEMA_VERSION, ...next }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage can be unavailable in private browsing or when its quota is exhausted.
  }
}

let state = readStorage()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function setState(next: WebhookState): void {
  state = next
  writeStorage(next)
  notify()
}

function generateSigningSecret(): string {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is unavailable.')
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(32))
  return `whsec_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function maskSecret(secret: string): string {
  return `whsec_••••••••${secret.slice(-4)}`
}

function getSnapshot(): WebhookState {
  return state
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function updateDelivery(id: string, update: (delivery: WebhookDelivery) => WebhookDelivery): void {
  setState({
    ...state,
    deliveries: state.deliveries.map((delivery) => delivery.id === id ? update(delivery) : delivery),
  })
}

export const webhooksStore = {
  getAll(): WebhookState {
    return state
  },

  createEndpoint(input: NewWebhookEndpoint): { endpoint: WebhookEndpoint; signingSecret: string } {
    const validation = validateWebhookUrl(input.url)
    if (!validation.valid) throw new TypeError(validation.error)
    if (isDuplicateWebhookUrl(input.url, state.endpoints.map((endpoint) => endpoint.url))) {
      throw new TypeError('An endpoint with this URL already exists.')
    }
    if (input.events.length === 0) throw new TypeError('Select at least one event.')

    const signingSecret = generateSigningSecret()
    const endpoint: WebhookEndpoint = {
      id: newId('wh-endpoint-'),
      url: input.url.trim(),
      description: input.description.trim(),
      events: [...input.events],
      enabled: true,
      createdAt: new Date().toISOString(),
      signingSecretMasked: maskSecret(signingSecret),
    }
    secretMaterial.set(endpoint.id, { current: signingSecret })
    setState({ ...state, endpoints: [endpoint, ...state.endpoints] })
    return { endpoint, signingSecret }
  },

  disableEndpoint(id: string): void {
    setState({
      ...state,
      endpoints: state.endpoints.map((endpoint) =>
        endpoint.id === id ? { ...endpoint, enabled: false } : endpoint,
      ),
    })
  },

  retryDelivery(id: string, at = new Date().toISOString()): boolean {
    const delivery = state.deliveries.find((item) => item.id === id)
    if (
      !delivery ||
      delivery.status !== 'failed' ||
      delivery.attempts.length >= WEBHOOK_MAX_ATTEMPTS ||
      inFlightRetries.has(id)
    ) return false

    inFlightRetries.add(id)
    const attempt: WebhookAttempt = {
      attempt: delivery.attempts.length + 1,
      at,
      statusCode: null,
      error: 'Retry in progress.',
    }
    updateDelivery(id, (current) => ({ ...current, status: 'retrying', attempts: [...current.attempts, attempt] }))
    return true
  },

  completeRetry(id: string, result: RetryResult): void {
    if (!inFlightRetries.has(id)) return
    const delivery = state.deliveries.find((item) => item.id === id)
    if (!delivery || delivery.status !== 'retrying') {
      inFlightRetries.delete(id)
      return
    }
    const delivered = result.statusCode !== null && result.statusCode >= 200 && result.statusCode < 300
    updateDelivery(id, (current) => ({
      ...current,
      status: (delivered ? 'delivered' : 'failed') as WebhookDeliveryStatus,
      attempts: current.attempts.map((attempt, index) =>
        index === current.attempts.length - 1
          ? { ...attempt, statusCode: result.statusCode, error: result.error }
          : attempt,
      ),
    }))
    inFlightRetries.delete(id)
  },

  rotateSecret(
    id: string,
    gracePeriodMs = WEBHOOK_SECRET_GRACE_PERIOD_MS,
    now = Date.now(),
  ): { oldSecret: RotatingSecret; newSecret: RotatingSecret } {
    if (!Number.isFinite(gracePeriodMs) || gracePeriodMs <= 0) {
      throw new RangeError('Secret grace period must be positive.')
    }
    const endpoint = state.endpoints.find((item) => item.id === id)
    if (!endpoint) throw new Error(`Webhook endpoint not found: ${id}`)

    const material = secretMaterial.get(id)
    const oldFull = material?.current ?? ''
    const newFull = generateSigningSecret()
    const expiresAt = new Date(now + gracePeriodMs).toISOString()
    secretMaterial.set(id, { current: newFull, previous: oldFull || undefined })
    const nextEndpoint: WebhookEndpoint = {
      ...endpoint,
      signingSecretMasked: maskSecret(newFull),
      previousSecretMasked: endpoint.signingSecretMasked,
      previousSecretExpiresAt: expiresAt,
    }
    setState({
      ...state,
      endpoints: state.endpoints.map((item) => item.id === id ? nextEndpoint : item),
    })

    return {
      oldSecret: {
        masked: endpoint.signingSecretMasked,
        full: '',
        lastUsedAt: null,
        expiresAt,
      },
      newSecret: {
        masked: nextEndpoint.signingSecretMasked,
        full: newFull,
        lastUsedAt: null,
        expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }
  },

  isPreviousSecretValid(id: string, now = Date.now()): boolean {
    const endpoint = state.endpoints.find((item) => item.id === id)
    return Boolean(
      endpoint?.previousSecretExpiresAt &&
      Date.parse(endpoint.previousSecretExpiresAt) > now,
    )
  },

  cancelRotation(id: string, now = Date.now()): void {
    const endpoint = state.endpoints.find((item) => item.id === id)
    const material = secretMaterial.get(id)
    if (!endpoint || !endpoint.previousSecretMasked) return
    const previousStillValid = Date.parse(endpoint.previousSecretExpiresAt ?? '') > now
    if (previousStillValid && material?.previous) {
      secretMaterial.set(id, { current: material.previous })
    } else if (previousStillValid) {
      secretMaterial.delete(id)
    } else if (material) {
      secretMaterial.set(id, { current: material.current })
    } else {
      secretMaterial.delete(id)
    }
    const restored: WebhookEndpoint = {
      ...endpoint,
      signingSecretMasked: previousStillValid
        ? endpoint.previousSecretMasked
        : endpoint.signingSecretMasked,
      previousSecretMasked: undefined,
      previousSecretExpiresAt: undefined,
    }
    setState({
      ...state,
      endpoints: state.endpoints.map((item) => item.id === id ? restored : item),
    })
  },

  reset(): void {
    inFlightRetries.clear()
    secretMaterial.clear()
    setState({ endpoints: [], deliveries: INITIAL_DELIVERIES })
  },
}

export function useWebhooks(): WebhookState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)
}
