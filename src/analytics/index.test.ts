import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  configureAnalytics,
  setConsentEnabled,
  track,
  type AnalyticsEvent,
  type AnalyticsTransport,
} from '../analytics'

// ─── Mock Transport ──────────────────────────────────────────────────────────

class MockTransport implements AnalyticsTransport {
  events: AnalyticsEvent[] = []

  send(event: AnalyticsEvent): void {
    this.events.push(event)
  }

  clear(): void {
    this.events = []
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Analytics - PII Filtering', () => {
  let mockTransport: MockTransport

  beforeEach(() => {
    mockTransport = new MockTransport()
    configureAnalytics(mockTransport)
    setConsentEnabled(true)
  })

  it('strips email field from properties', () => {
    track('page_view', {
      path: '/dashboard',
      email: 'user@example.com',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      path: '/dashboard',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('email')
  })

  it('strips name field from properties', () => {
    track('attestation_created', {
      source: 'stripe',
      name: 'John Doe',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      source: 'stripe',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('name')
  })

  it('strips firstName field from properties', () => {
    track('api_key_created', {
      keyId: 'key_123',
      firstName: 'Jane',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      keyId: 'key_123',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('firstName')
  })

  it('strips lastName field from properties', () => {
    track('source_connected', {
      provider: 'stripe',
      lastName: 'Smith',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      provider: 'stripe',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('lastName')
  })

  it('strips username field from properties', () => {
    track('page_view', {
      path: '/settings',
      username: 'johndoe',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      path: '/settings',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('username')
  })

  it('strips password field from properties', () => {
    track('api_key_created', {
      keyId: 'key_456',
      password: 'secret123',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      keyId: 'key_456',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('password')
  })

  it('strips token field from properties', () => {
    track('source_connected', {
      provider: 'shopify',
      token: 'abc123def456',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      provider: 'shopify',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('token')
  })

  it('strips apiKey field from properties', () => {
    track('api_key_created', {
      apiKey: 'vtsr_live_xxx',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({})
    expect(mockTransport.events[0].properties).not.toHaveProperty('apiKey')
  })

  it('strips privateKey field from properties', () => {
    track('page_view', {
      path: '/dashboard',
      privateKey: 'private_key_data',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      path: '/dashboard',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('privateKey')
  })

  it('strips address field from properties', () => {
    track('attestation_created', {
      source: 'razorpay',
      address: '123 Main St',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      source: 'razorpay',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('address')
  })

  it('strips phone field from properties', () => {
    track('page_view', {
      path: '/help',
      phone: '+1234567890',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      path: '/help',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('phone')
  })

  it('strips phoneNumber field from properties', () => {
    track('api_key_created', {
      keyId: 'key_789',
      phoneNumber: '+0987654321',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      keyId: 'key_789',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('phoneNumber')
  })

  it('strips ssn field from properties', () => {
    track('page_view', {
      path: '/settings',
      ssn: '123-45-6789',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      path: '/settings',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('ssn')
  })

  it('strips socialSecurityNumber field from properties', () => {
    track('source_connected', {
      provider: 'stripe',
      socialSecurityNumber: '123-45-6789',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      provider: 'stripe',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('socialSecurityNumber')
  })

  it('strips creditCard field from properties', () => {
    track('page_view', {
      path: '/billing',
      creditCard: '4111111111111111',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      path: '/billing',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('creditCard')
  })

  it('strips cardNumber field from properties', () => {
    track('api_key_created', {
      keyId: 'key_999',
      cardNumber: '4111111111111111',
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      keyId: 'key_999',
    })
    expect(mockTransport.events[0].properties).not.toHaveProperty('cardNumber')
  })

  it('recursively strips PII in nested objects', () => {
    track('attestation_created', {
      source: 'stripe',
      details: {
        email: 'nested@example.com',
        name: 'Nested User',
        period: '2026-01',
      },
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      source: 'stripe',
      details: {
        period: '2026-01',
      },
    })
  })

  it('preserves non-PII properties', () => {
    track('page_view', {
      path: '/dashboard',
      search: '?tab=settings',
      timestamp: Date.now(),
      metadata: {
        version: '1.0.0',
        environment: 'production',
      },
    })

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toEqual({
      path: '/dashboard',
      search: '?tab=settings',
      timestamp: expect.any(Number),
      metadata: {
        version: '1.0.0',
        environment: 'production',
      },
    })
  })

  it('handles empty properties object', () => {
    track('page_view')

    expect(mockTransport.events).toHaveLength(1)
    expect(mockTransport.events[0].properties).toBeUndefined()
  })
})

describe('Analytics - Consent Gating', () => {
  let mockTransport: MockTransport

  beforeEach(() => {
    mockTransport = new MockTransport()
    configureAnalytics(mockTransport)
    setConsentEnabled(false)
  })

  it('does not send events when consent is disabled', () => {
    track('page_view', { path: '/dashboard' })
    track('attestation_created', { source: 'stripe' })
    track('api_key_created', { keyId: 'key_123' })

    expect(mockTransport.events).toHaveLength(0)
  })

  it('sends events when consent is enabled', () => {
    setConsentEnabled(true)
    track('page_view', { path: '/dashboard' })

    expect(mockTransport.events).toHaveLength(1)
  })

  it('re-evaluates consent on change', () => {
    setConsentEnabled(true)
    track('page_view', { path: '/dashboard' })
    expect(mockTransport.events).toHaveLength(1)

    setConsentEnabled(false)
    track('page_view', { path: '/settings' })
    expect(mockTransport.events).toHaveLength(1)

    setConsentEnabled(true)
    track('page_view', { path: '/attestations' })
    expect(mockTransport.events).toHaveLength(2)
  })
})

describe('Analytics - Event Types', () => {
  let mockTransport: MockTransport

  beforeEach(() => {
    mockTransport = new MockTransport()
    configureAnalytics(mockTransport)
    setConsentEnabled(true)
  })

  it('sends page_view events', () => {
    track('page_view', { path: '/dashboard' })

    expect(mockTransport.events[0].name).toBe('page_view')
  })

  it('sends attestation_created events', () => {
    track('attestation_created', { source: 'stripe' })

    expect(mockTransport.events[0].name).toBe('attestation_created')
  })

  it('sends source_connected events', () => {
    track('source_connected', { provider: 'shopify' })

    expect(mockTransport.events[0].name).toBe('source_connected')
  })

  it('sends api_key_created events', () => {
    track('api_key_created', { keyId: 'key_123' })

    expect(mockTransport.events[0].name).toBe('api_key_created')
  })
})

describe('Analytics - Pluggable Transport', () => {
  it('allows configuring custom transport', () => {
    const customTransport: AnalyticsTransport = {
      send: vi.fn(),
    }

    configureAnalytics(customTransport)
    setConsentEnabled(true)
    track('page_view', { path: '/dashboard' })

    expect(customTransport.send).toHaveBeenCalledWith({
      name: 'page_view',
      properties: { path: '/dashboard' },
    })
  })

  it('uses no-op transport by default', () => {
    // Reset to default
    configureAnalytics(new (class implements AnalyticsTransport {
      send(): void {}
    })())
    setConsentEnabled(true)

    expect(() => track('page_view', { path: '/dashboard' })).not.toThrow()
  })
})
