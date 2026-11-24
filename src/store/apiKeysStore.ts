import { useSyncExternalStore } from 'react'
import type { ApiKey } from '../components/api-keys/apiKeyTypes'

const today = new Date('2026-07-28T10:08:33Z')

function addDays(base: Date, days: number) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export const INITIAL_KEYS: ApiKey[] = [
  {
    id: 'key_001',
    label: 'Admin (rotatable)',
    status: 'active',
    createdAt: '2026-06-01T14:00:00Z',
    expiresAt: '2026-12-01T00:00:00Z',
    scopes: ['read:attestations', 'write:attestations'],
    maskedKey: 'vtsr_live_5e3a…b91c',
    rotationDue: addDays(today, 8),
  },
  {
    id: 'key_002',
    label: 'Auditor (read-only)',
    status: 'active',
    createdAt: '2026-05-20T10:15:00Z',
    expiresAt: '2026-11-20T00:00:00Z',
    scopes: ['read:attestations'],
    maskedKey: 'vtsr_live_aa1f…0c2d',
    rotationDue: addDays(today, 20),
  },
  {
    id: 'key_003',
    label: 'Expired (history)',
    status: 'expired',
    createdAt: '2026-03-10T09:00:00Z',
    expiresAt: '2026-04-10T00:00:00Z',
    scopes: ['read:attestations'],
    maskedKey: 'vtsr_live_1f2e…d9a0',
  },
]

let state = [...INITIAL_KEYS]
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  for (const listener of listeners) listener()
}

function setState(keys: ApiKey[]) {
  state = keys
  notify()
}

export const apiKeysStore = {
  add(key: ApiKey) {
    if (state.some((item) => item.id === key.id)) return
    setState([key, ...state])
  },

  update(id: string, patch: Partial<ApiKey>) {
    setState(state.map((key) => (key.id === id ? { ...key, ...patch } : key)))
  },

  reset() {
    setState([...INITIAL_KEYS])
  },

  getAll() {
    return state
  },
}

export function useApiKeys(): ApiKey[] {
  return useSyncExternalStore(subscribe, apiKeysStore.getAll, () => INITIAL_KEYS)
}
