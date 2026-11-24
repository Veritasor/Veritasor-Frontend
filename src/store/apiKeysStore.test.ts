import { beforeEach, describe, expect, it } from 'vitest'
import { apiKeysStore, INITIAL_KEYS } from './apiKeysStore'

describe('apiKeysStore', () => {
  beforeEach(() => {
    apiKeysStore.reset()
  })

  it('starts with the initial keys and resets changes', () => {
    expect(apiKeysStore.getAll()).toEqual(INITIAL_KEYS)
    apiKeysStore.update('key_001', { status: 'revoked' })
    apiKeysStore.reset()
    expect(apiKeysStore.getAll()).toEqual(INITIAL_KEYS)
  })

  it('prepends new keys and ignores duplicate IDs', () => {
    const key = {
      id: 'key_test',
      label: 'Test',
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-04-01T00:00:00Z',
      scopes: ['read:attestations'],
      maskedKey: 'vtsr_live_1234…abcd',
    }

    apiKeysStore.add(key)
    apiKeysStore.add({ ...key, label: 'Duplicate' })

    expect(apiKeysStore.getAll()[0]).toEqual(key)
    expect(apiKeysStore.getAll()).toHaveLength(INITIAL_KEYS.length + 1)
  })
})
