import type { AttestationDetails } from '../components/AttestationConfirmModal'
import { MOCK_ATTESTATIONS } from '../state/attestationMocks'
import type { Attestation } from '../state/attestations'
import { ApiError, apiFetch } from './apiClient'

export { ApiError }

export interface ListAttestationsResult {
  items: Attestation[]
  nextCursor: string | null
  hasMore: boolean
}

export interface AttestationsApi {
  listAttestations: (cursor?: string | null, limit?: number) => Promise<ListAttestationsResult>
  getAttestation: (id: string) => Promise<Attestation>
  createAttestation: (details: AttestationDetails) => Promise<Attestation>
}

export interface MockAttestationsApiOptions {
  pageSize?: number
  delayMs?: number
}

export function isMockMode(): boolean {
  const flag = import.meta.env.VITE_USE_MOCKS
  if (flag === undefined || flag === '') {
    return true
  }
  return flag.toLowerCase() !== 'false' && flag !== '0'
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createMockAttestationsApi(
  seed: Attestation[] = MOCK_ATTESTATIONS,
  options: MockAttestationsApiOptions = {},
): AttestationsApi {
  const defaultPageSize = options.pageSize ?? 50
  const delayMs = options.delayMs ?? 0
  let records = [...seed]
  let nextId = 1

  return {
    async listAttestations(cursor?: string | null, limit = defaultPageSize) {
      await wait(delayMs)
      const parsedOffset = cursor ? Number.parseInt(cursor, 10) : 0
      const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0
      const pageSize = Math.max(1, limit)
      const items = records.slice(offset, offset + pageSize)
      const nextOffset = offset + items.length
      const hasMore = nextOffset < records.length

      return {
        items,
        nextCursor: hasMore ? String(nextOffset) : null,
        hasMore,
      }
    },

    async getAttestation(id: string) {
      await wait(delayMs)
      const found = records.find((item) => item.id === id)
      if (!found) {
        throw new ApiError(`Attestation ${id} was not found.`, 404, { code: 'NOT_FOUND' })
      }
      return found
    },

    async createAttestation(details: AttestationDetails) {
      await wait(delayMs)
      if (details.recordCount <= 0) {
        throw new ApiError('The revenue report contains no records.', 400, {
          code: 'EMPTY_REPORT',
        })
      }

      const now = new Date().toISOString()
      const created: Attestation = {
        ...details,
        id: `att-${Date.now()}-${nextId++}`,
        status: 'verified',
        createdAt: now,
        timestamp: now,
        stellarTxHash: '',
        totalRevenue: '0.00',
        currency: 'USD',
      }
      records = [created, ...records]
      return created
    },
  }
}

export const httpAttestationsApi: AttestationsApi = {
  async listAttestations(cursor?: string | null, limit?: number) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit !== undefined) params.set('limit', String(limit))
    const query = params.toString()
    return apiFetch<ListAttestationsResult>(`/api/attestations${query ? `?${query}` : ''}`)
  },

  async getAttestation(id: string) {
    return apiFetch<Attestation>(`/api/attestations/${encodeURIComponent(id)}`)
  },

  async createAttestation(details: AttestationDetails) {
    return apiFetch<Attestation>('/api/attestations', {
      method: 'POST',
      body: JSON.stringify(details),
    })
  },
}

const defaultMockApi = createMockAttestationsApi()

export function getDefaultAttestationsApi(): AttestationsApi {
  return isMockMode() ? defaultMockApi : httpAttestationsApi
}

export function listAttestations(
  cursor?: string | null,
  limit?: number,
): Promise<ListAttestationsResult> {
  return getDefaultAttestationsApi().listAttestations(cursor, limit)
}

export function getAttestation(id: string): Promise<Attestation> {
  return getDefaultAttestationsApi().getAttestation(id)
}

export function createAttestation(details: AttestationDetails): Promise<Attestation> {
  return getDefaultAttestationsApi().createAttestation(details)
}
