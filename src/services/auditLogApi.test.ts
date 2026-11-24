import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  auditLogApi,
  AuditLogNotFoundError,
  DEFAULT_AUDIT_DETAIL_LATENCY_MS,
  getAuditEventDetail,
} from './auditLogApi'

describe('auditLogApi.getAuditEventDetail', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with enriched detail for a known audit event id', async () => {
    const detail = await auditLogApi.getAuditEventDetail('1', { delayMs: 0 })

    expect(detail.id).toBe('1')
    expect(detail.event).toBe('Attestation completed')
    expect(detail.actor).toBe('joel@example.com')
    expect(detail.method).toBe('POST')
    expect(detail.statusCode).toBe(200)
    expect(detail.requestHeaders).toBeDefined()
    expect(detail.requestPayload).toBeDefined()
    expect(detail.responsePayload).toBeDefined()
  })

  it('returns a fresh copy so caller mutations do not pollute mock data', async () => {
    const first = await getAuditEventDetail('2', { delayMs: 0 })
    first.event = 'Mutated event'

    const second = await getAuditEventDetail('2', { delayMs: 0 })
    expect(second.event).toBe('Attestation completed')
  })

  it('simulates network latency before resolving', async () => {
    vi.useFakeTimers()
    let resolved = false
    const promise = auditLogApi.getAuditEventDetail('1').then((res) => {
      resolved = true
      return res
    })

    await vi.advanceTimersByTimeAsync(DEFAULT_AUDIT_DETAIL_LATENCY_MS - 1)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    const detail = await promise
    expect(resolved).toBe(true)
    expect(detail.id).toBe('1')
  })

  it('rejects with AuditLogNotFoundError for an unknown event id', async () => {
    await expect(
      auditLogApi.getAuditEventDetail('non-existent-id', { delayMs: 0 }),
    ).rejects.toThrow(AuditLogNotFoundError)

    try {
      await auditLogApi.getAuditEventDetail('missing-42', { delayMs: 0 })
    } catch (err) {
      expect(err).toBeInstanceOf(AuditLogNotFoundError)
      const notFound = err as AuditLogNotFoundError
      expect(notFound.status).toBe(404)
      expect(notFound.eventId).toBe('missing-42')
      expect(notFound.message).toContain('missing-42')
    }
  })

  it('rejects with AbortError when aborted before completion', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const promise = auditLogApi.getAuditEventDetail('1', {
      delayMs: 200,
      signal: controller.signal,
    })

    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
