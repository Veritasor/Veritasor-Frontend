// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyticsEventName =
  | 'page_view'
  | 'attestation_created'
  | 'source_connected'
  | 'api_key_created'

export interface AnalyticsEvent {
  name: AnalyticsEventName
  properties?: Record<string, unknown>
}

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): void | Promise<void>
}

// ─── PII Filtering ───────────────────────────────────────────────────────────

const PII_KEYS = new Set([
  'email',
  'name',
  'firstName',
  'lastName',
  'fullName',
  'username',
  'password',
  'secret',
  'token',
  'apiKey',
  'privateKey',
  'address',
  'phone',
  'phoneNumber',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cardNumber',
])

function stripPII(properties: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (PII_KEYS.has(key)) {
      continue
    }

    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = stripPII(value as Record<string, unknown>)
    } else {
      cleaned[key] = value
    }
  }

  return cleaned
}

// ─── No-op Transport (default) ───────────────────────────────────────────────

class NoOpTransport implements AnalyticsTransport {
  send(_event: AnalyticsEvent): void {
    // No-op
  }
}

// ─── Analytics Core ───────────────────────────────────────────────────────────

let transport: AnalyticsTransport = new NoOpTransport()
let consentEnabled = false

export function configureAnalytics(newTransport: AnalyticsTransport): void {
  transport = newTransport
}

export function setConsentEnabled(enabled: boolean): void {
  consentEnabled = enabled
}

export function track(eventName: AnalyticsEventName, properties?: Record<string, unknown>): void {
  if (!consentEnabled) {
    return
  }

  const cleanedProperties = properties ? stripPII(properties) : undefined

  const event: AnalyticsEvent = {
    name: eventName,
    properties: cleanedProperties,
  }

  transport.send(event)
}

// ─── React Hook ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useTrackPageViews(): void {
  const location = useLocation()

  useEffect(() => {
    track('page_view', {
      path: location.pathname,
      search: location.search,
    })
  }, [location.pathname, location.search])
}
