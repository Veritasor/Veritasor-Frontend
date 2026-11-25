import { describe, expect, it } from 'vitest'
import { MOCK_ATTESTATIONS } from './attestationMocks'
import {
  attestationsReducer,
  INITIAL_ATTESTATIONS_STATE,
  type AttestationsState,
} from './attestations'

describe('attestationsReducer', () => {
  it('handles LOAD_START for initial load', () => {
    const next = attestationsReducer(
      { ...INITIAL_ATTESTATIONS_STATE, status: 'error', error: 'Boom' },
      { type: 'LOAD_START' },
    )
    expect(next.status).toBe('loading')
    expect(next.error).toBeNull()
    expect(next.isLoadingMore).toBe(false)
  })

  it('handles LOAD_START with append=true without clearing existing status', () => {
    const prev: AttestationsState = {
      items: [MOCK_ATTESTATIONS[0]],
      status: 'success',
      error: 'Previous error',
      nextCursor: '1',
      hasMore: true,
      isLoadingMore: false,
    }
    const next = attestationsReducer(prev, { type: 'LOAD_START', append: true })
    expect(next.status).toBe('success')
    expect(next.isLoadingMore).toBe(true)
    expect(next.error).toBeNull()
  })

  it('handles LOAD_SUCCESS', () => {
    const next = attestationsReducer(
      { ...INITIAL_ATTESTATIONS_STATE, status: 'loading' },
      {
        type: 'LOAD_SUCCESS',
        items: [MOCK_ATTESTATIONS[0], MOCK_ATTESTATIONS[1]],
        nextCursor: '2',
        hasMore: true,
      },
    )
    expect(next.status).toBe('success')
    expect(next.items).toHaveLength(2)
    expect(next.nextCursor).toBe('2')
    expect(next.hasMore).toBe(true)
    expect(next.error).toBeNull()
    expect(next.isLoadingMore).toBe(false)
  })

  it('handles LOAD_ERROR', () => {
    const next = attestationsReducer(
      { ...INITIAL_ATTESTATIONS_STATE, status: 'loading', isLoadingMore: true },
      { type: 'LOAD_ERROR', error: 'Network unavailable' },
    )
    expect(next.status).toBe('error')
    expect(next.error).toBe('Network unavailable')
    expect(next.isLoadingMore).toBe(false)
  })

  it('handles APPEND and deduplicates by id', () => {
    const prev: AttestationsState = {
      items: [MOCK_ATTESTATIONS[0], MOCK_ATTESTATIONS[1]],
      status: 'success',
      error: null,
      nextCursor: '2',
      hasMore: true,
      isLoadingMore: true,
    }
    const next = attestationsReducer(prev, {
      type: 'APPEND',
      items: [MOCK_ATTESTATIONS[1], MOCK_ATTESTATIONS[2]],
      nextCursor: null,
      hasMore: false,
    })
    expect(next.items.map((item) => item.id)).toEqual(['att-001', 'att-002', 'att-003'])
    expect(next.hasMore).toBe(false)
    expect(next.nextCursor).toBeNull()
    expect(next.isLoadingMore).toBe(false)
    expect(next.status).toBe('success')
  })

  it('handles trigger by prepending without duplicates', () => {
    const prev: AttestationsState = {
      ...INITIAL_ATTESTATIONS_STATE,
      items: [MOCK_ATTESTATIONS[0]],
      status: 'success',
    }
    const next = attestationsReducer(prev, {
      type: 'trigger',
      attestation: MOCK_ATTESTATIONS[1],
    })
    expect(next.items.map((item) => item.id)).toEqual(['att-002', 'att-001'])
  })

  it('handles transition for a matching attestation id', () => {
    const prev: AttestationsState = {
      ...INITIAL_ATTESTATIONS_STATE,
      items: [MOCK_ATTESTATIONS[1]],
      status: 'success',
    }
    const next = attestationsReducer(prev, {
      type: 'transition',
      id: 'att-002',
      status: 'failed',
      failureReason: 'Timeout',
      remediation: 'Retry later',
    })
    expect(next.items[0].status).toBe('failed')
    expect(next.items[0].failureReason).toBe('Timeout')
    expect(next.items[0].remediation).toBe('Retry later')
  })
})
