import type { AuditLogEntryDetail } from '../components/audit-log/AuditLogDetailDrawer'

export const DEFAULT_AUDIT_DETAIL_LATENCY_MS = 120

export class AuditLogNotFoundError extends Error {
  readonly status = 404
  readonly eventId: string

  constructor(eventId: string) {
    super(`Audit log event "${eventId}" not found`)
    this.name = 'AuditLogNotFoundError'
    this.eventId = eventId
    Object.setPrototypeOf(this, AuditLogNotFoundError.prototype)
  }
}

// Simulated detail data for each audit log entry.
// In production this would be fetched from the API by entry id.
export const MOCK_AUDIT_DETAILS: Record<string, AuditLogEntryDetail> = {
  '1': {
    id: '1',
    timestamp: '2026-07-28T08:12:00Z',
    event: 'Attestation completed',
    details: 'Merkle root: 0x7f...3a',
    severity: 'info',
    actor: 'joel@example.com',
    ip: '203.0.113.42',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    method: 'POST',
    path: '/api/v1/attestations',
    statusCode: 200,
    requestHeaders: {
      'content-type': 'application/json',
      authorization: 'Bearer vrt_live_••••3f9a',
      'x-request-id': 'req_01j8abc123xyz',
    },
    requestPayload: {
      source: 'stripe',
      period: '2026-06',
      recordCount: 1247,
    },
    responsePayload: {
      id: 'att_01j8xyz',
      merkleRoot: '0x7f3a2c9b1d8e4f06a5c2b7e3d1f09a4c',
      status: 'completed',
      timestamp: '2026-07-28T08:12:00Z',
      event: 'Attestation completed',
      details: 'Merkle root: 0x7f...3a',
      severity: 'info',
    },
  },
  '2': {
    id: '2',
    timestamp: '2026-07-28T08:14:00Z',
    event: 'Attestation completed',
    details: 'Merkle root: 0x7f...3a',
    severity: 'info',
  },
  '3': {
    id: '3',
    timestamp: '2026-07-28T08:15:00Z',
    event: 'Attestation completed',
    details: 'Merkle root: 0x7f...3a',
    severity: 'info',
  },
  '4': {
    id: '4',
    timestamp: '2026-07-28T09:00:00Z',
    event: 'Revenue source connected',
    details: 'Provider: Stripe',
    severity: 'info',
  },
  '5': {
    id: '5',
    timestamp: '2026-07-27T14:30:00Z',
    event: 'Attestation failed',
    details: 'Timeout after 30s',
    severity: 'error',
  },
  '6': {
    id: '6',
    timestamp: '2026-07-27T14:31:00Z',
    event: 'Attestation failed',
    details: 'Timeout after 30s',
    severity: 'error',
  },
  '7': {
    id: '7',
    timestamp: '2026-07-27T14:32:00Z',
    event: 'Attestation failed',
    details: 'Timeout after 30s',
    severity: 'error',
  },
  '8': {
    id: '8',
    timestamp: '2026-07-27T14:33:00Z',
    event: 'Attestation failed',
    details: 'Timeout after 30s',
    severity: 'error',
  },
  '9': {
    id: '9',
    timestamp: '2026-07-26T10:00:00Z',
    event: 'API key rotated',
    severity: 'warn',
  },
}

export interface GetAuditEventDetailOptions {
  delayMs?: number
  signal?: AbortSignal
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  }
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function getAuditEventDetail(
  id: string,
  options: GetAuditEventDetailOptions = {},
): Promise<AuditLogEntryDetail> {
  const { delayMs = DEFAULT_AUDIT_DETAIL_LATENCY_MS, signal } = options
  await wait(delayMs, signal)

  const detail = MOCK_AUDIT_DETAILS[id]
  if (!detail) {
    throw new AuditLogNotFoundError(id)
  }

  return { ...detail }
}

export const auditLogApi = {
  getAuditEventDetail,
}
