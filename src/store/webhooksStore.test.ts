import { beforeEach, describe, expect, it } from 'vitest'
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_SECRET_GRACE_PERIOD_MS,
  webhooksStore,
} from './webhooksStore'

describe('webhooksStore', () => {
  beforeEach(() => {
    localStorage.clear()
    webhooksStore.reset()
  })

  it('creates endpoints with one-time secrets and persists endpoints without secret material', () => {
    const result = webhooksStore.createEndpoint({
      url: 'https://example.com/webhook',
      description: 'Build notifications',
      events: ['attestation.completed'],
    })

    expect(result.signingSecret).toMatch(/^whsec_[\da-f]{64}$/)
    expect(result.endpoint.signingSecretMasked).not.toContain(result.signingSecret)
    expect(localStorage.getItem('veritasor-webhooks-v1')).not.toContain(result.signingSecret)
    expect(() => webhooksStore.createEndpoint({
      url: 'https://EXAMPLE.com:443/webhook',
      description: '',
      events: ['attestation.completed'],
    })).toThrow(/already exists/i)
  })

  it('records a single in-flight retry and appends the completion to attempt history', () => {
    const before = webhooksStore.getAll().deliveries.find((delivery) => delivery.id === 'wh_001')!

    expect(webhooksStore.retryDelivery(before.id, '2026-08-01T10:00:00.000Z')).toBe(true)
    expect(webhooksStore.retryDelivery(before.id)).toBe(false)
    expect(webhooksStore.getAll().deliveries.find((delivery) => delivery.id === before.id)?.attempts).toHaveLength(4)
    expect(webhooksStore.getAll().deliveries.find((delivery) => delivery.id === before.id)?.status).toBe('retrying')

    webhooksStore.completeRetry(before.id, { statusCode: 204 })
    expect(webhooksStore.getAll().deliveries.find((delivery) => delivery.id === before.id)?.status).toBe('delivered')
    expect(webhooksStore.getAll().deliveries.find((delivery) => delivery.id === before.id)?.attempts[3]).toMatchObject({
      attempt: 4,
      statusCode: 204,
    })
  })

  it('refuses retries at the attempt limit', () => {
    const delivery = webhooksStore.getAll().deliveries.find((item) => item.id === 'wh_001')!
    for (let attempt = delivery.attempts.length + 1; attempt <= WEBHOOK_MAX_ATTEMPTS; attempt += 1) {
      expect(webhooksStore.retryDelivery(delivery.id, new Date(attempt).toISOString())).toBe(true)
      webhooksStore.completeRetry(delivery.id, { statusCode: 500, error: 'failed' })
    }

    expect(webhooksStore.retryDelivery(delivery.id)).toBe(false)
    expect(webhooksStore.getAll().deliveries.find((item) => item.id === delivery.id)?.attempts).toHaveLength(WEBHOOK_MAX_ATTEMPTS)
  })

  it('keeps the previous signing secret valid only through its grace expiry', () => {
    const { endpoint } = webhooksStore.createEndpoint({
      url: 'https://example.com/rotate',
      description: '',
      events: ['attestation.completed'],
    })
    const now = Date.parse('2026-08-01T10:00:00.000Z')

    webhooksStore.rotateSecret(endpoint.id, WEBHOOK_SECRET_GRACE_PERIOD_MS, now)

    expect(webhooksStore.isPreviousSecretValid(endpoint.id, now)).toBe(true)
    expect(webhooksStore.isPreviousSecretValid(endpoint.id, now + WEBHOOK_SECRET_GRACE_PERIOD_MS - 1)).toBe(true)
    expect(webhooksStore.isPreviousSecretValid(endpoint.id, now + WEBHOOK_SECRET_GRACE_PERIOD_MS)).toBe(false)
  })

  it('cancels a rotation by restoring the previous active masked secret', () => {
    const { endpoint } = webhooksStore.createEndpoint({
      url: 'https://example.com/cancel-rotation',
      description: '',
      events: ['attestation.completed'],
    })
    const previousMask = endpoint.signingSecretMasked
    webhooksStore.rotateSecret(endpoint.id)
    webhooksStore.cancelRotation(endpoint.id)

    const restored = webhooksStore.getAll().endpoints.find((item) => item.id === endpoint.id)!
    expect(restored.signingSecretMasked).toBe(previousMask)
    expect(restored.previousSecretExpiresAt).toBeUndefined()
    expect(webhooksStore.isPreviousSecretValid(endpoint.id)).toBe(false)
  })

  it('does not restore the old secret after its grace period expires', () => {
    const { endpoint } = webhooksStore.createEndpoint({
      url: 'https://example.com/expired-rotation',
      description: '',
      events: ['attestation.completed'],
    })
    const now = Date.parse('2026-08-01T10:00:00.000Z')
    webhooksStore.rotateSecret(endpoint.id, 1000, now)
    const rotatedMask = webhooksStore.getAll().endpoints.find((item) => item.id === endpoint.id)!.signingSecretMasked

    webhooksStore.cancelRotation(endpoint.id, now + 1000)

    const active = webhooksStore.getAll().endpoints.find((item) => item.id === endpoint.id)!
    expect(active.signingSecretMasked).toBe(rotatedMask)
    expect(active.previousSecretExpiresAt).toBeUndefined()
  })
})
