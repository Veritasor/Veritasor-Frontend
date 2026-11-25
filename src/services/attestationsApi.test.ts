import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOCK_ATTESTATIONS } from '../state/attestationMocks'
import { ApiError, apiFetch } from './apiClient'
import {
  createMockAttestationsApi,
  httpAttestationsApi,
  isMockMode,
} from './attestationsApi'

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed JSON on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const result = await apiFetch<{ ok: boolean }>('/api/attestations')
    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('throws ApiError with status and message on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not found', code: 'NOT_FOUND' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(apiFetch('/api/attestations/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Not found',
      code: 'NOT_FOUND',
    })
  })
})

describe('createMockAttestationsApi', () => {
  it('paginates with cursors and reports hasMore accurately', async () => {
    const api = createMockAttestationsApi(MOCK_ATTESTATIONS, { pageSize: 2 })

    const page1 = await api.listAttestations(null)
    expect(page1.items.map((a) => a.id)).toEqual(['att-001', 'att-002'])
    expect(page1.hasMore).toBe(true)
    expect(page1.nextCursor).toBe('2')

    const page2 = await api.listAttestations(page1.nextCursor)
    expect(page2.items.map((a) => a.id)).toEqual(['att-003'])
    expect(page2.hasMore).toBe(false)
    expect(page2.nextCursor).toBeNull()
  })

  it('fetches an attestation by id and throws 404 ApiError when missing', async () => {
    const api = createMockAttestationsApi(MOCK_ATTESTATIONS)

    const found = await api.getAttestation('att-002')
    expect(found.id).toBe('att-002')

    await expect(api.getAttestation('att-missing')).rejects.toBeInstanceOf(ApiError)
    await expect(api.getAttestation('att-missing')).rejects.toMatchObject({ status: 404 })
  })

  it('creates an attestation and prepends it to the mock list', async () => {
    const api = createMockAttestationsApi(MOCK_ATTESTATIONS)

    const created = await api.createAttestation({
      source: 'Stripe (live)',
      period: 'June 2026',
      recordCount: 120,
      merkleRoot: '0xabc123',
    })
    expect(created.id).toMatch(/^att-/)
    expect(created.status).toBe('verified')

    const list = await api.listAttestations(null)
    expect(list.items[0].id).toBe(created.id)
  })

  it('rejects creating an attestation with zero records', async () => {
    const api = createMockAttestationsApi(MOCK_ATTESTATIONS)
    await expect(
      api.createAttestation({
        source: 'Stripe (live)',
        period: 'June 2026',
        recordCount: 0,
        merkleRoot: '0xabc123',
      }),
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('httpAttestationsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls GET /api/attestations with cursor and limit params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await httpAttestationsApi.listAttestations('cursor-2', 25)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/attestations?cursor=cursor-2&limit=25'),
      expect.any(Object),
    )
  })

  it('calls GET /api/attestations/:id and POST /api/attestations', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ATTESTATIONS[0]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ATTESTATIONS[0]), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      )

    const fetched = await httpAttestationsApi.getAttestation('att-001')
    expect(fetched.id).toBe('att-001')

    await httpAttestationsApi.createAttestation({
      source: 'Stripe',
      period: 'May 2026',
      recordCount: 10,
      merkleRoot: '0x123',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/attestations'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('defaults isMockMode to true when VITE_USE_MOCKS is not false', () => {
    expect(isMockMode()).toBe(true)
  })
})
