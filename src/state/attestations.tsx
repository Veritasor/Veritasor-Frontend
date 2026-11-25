import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AttestationDetails } from '../components/AttestationConfirmModal'
import {
  ApiError,
  createMockAttestationsApi,
  getDefaultAttestationsApi,
  isMockMode,
  type AttestationsApi,
} from '../services/attestationsApi'
import { MOCK_ATTESTATIONS } from './attestationMocks'

export type AttestationStatus = 'verified' | 'pending' | 'failed'

export interface Attestation extends AttestationDetails {
  id: string
  status: AttestationStatus
  createdAt: string
  timestamp: string
  stellarTxHash: string
  totalRevenue: string
  currency: string
  failureReason?: string
  remediation?: string
}

export type AttestationsLoadStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AttestationsState {
  items: Attestation[]
  status: AttestationsLoadStatus
  error: string | null
  nextCursor: string | null
  hasMore: boolean
  isLoadingMore: boolean
}

export type AttestationAction =
  | { type: 'LOAD_START'; append?: boolean }
  | {
      type: 'LOAD_SUCCESS'
      items: Attestation[]
      nextCursor: string | null
      hasMore: boolean
    }
  | { type: 'LOAD_ERROR'; error: string }
  | {
      type: 'APPEND'
      items: Attestation[]
      nextCursor: string | null
      hasMore: boolean
    }
  | { type: 'trigger'; attestation: Attestation }
  | {
      type: 'transition'
      id: string
      status: Exclude<AttestationStatus, 'pending'>
      failureReason?: string
      remediation?: string
    }

export const INITIAL_ATTESTATIONS_STATE: AttestationsState = {
  items: [],
  status: 'idle',
  error: null,
  nextCursor: null,
  hasMore: false,
  isLoadingMore: false,
}

function appendUnique(existing: Attestation[], incoming: Attestation[]): Attestation[] {
  if (incoming.length === 0) return existing
  const seen = new Set(existing.map((item) => item.id))
  const uniqueIncoming = incoming.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
  return uniqueIncoming.length > 0 ? [...existing, ...uniqueIncoming] : existing
}

export function attestationsReducer(
  state: AttestationsState,
  action: AttestationAction,
): AttestationsState {
  switch (action.type) {
    case 'LOAD_START':
      if (action.append) {
        return {
          ...state,
          isLoadingMore: true,
          error: null,
        }
      }
      return {
        ...state,
        status: 'loading',
        error: null,
        isLoadingMore: false,
      }

    case 'LOAD_SUCCESS':
      return {
        ...state,
        items: action.items,
        status: 'success',
        error: null,
        nextCursor: action.nextCursor,
        hasMore: action.hasMore,
        isLoadingMore: false,
      }

    case 'LOAD_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.error,
        isLoadingMore: false,
      }

    case 'APPEND':
      return {
        ...state,
        items: appendUnique(state.items, action.items),
        status: 'success',
        error: null,
        nextCursor: action.nextCursor,
        hasMore: action.hasMore,
        isLoadingMore: false,
      }

    case 'trigger': {
      const filtered = state.items.filter((item) => item.id !== action.attestation.id)
      return {
        ...state,
        items: [action.attestation, ...filtered],
      }
    }

    case 'transition':
      return {
        ...state,
        items: state.items.map((attestation) =>
          attestation.id === action.id
            ? {
                ...attestation,
                status: action.status,
                failureReason: action.failureReason,
                remediation: action.remediation,
              }
            : attestation,
        ),
      }
  }
}

export interface AttestationsContextValue {
  list: Attestation[]
  status: AttestationsLoadStatus
  error: string | null
  hasMore: boolean
  isLoadingMore: boolean
  lastUpdated: string
  getById: (id: string) => Attestation | undefined
  fetchById: (id: string) => Promise<Attestation | null>
  loadMore: () => Promise<void>
  trigger: (details: AttestationDetails) => Promise<Attestation>
  refresh: () => Promise<void>
}

const AttestationsContext = createContext<AttestationsContextValue | undefined>(undefined)

export function AttestationsProvider({
  children,
  initialAttestations,
  api,
}: {
  children: ReactNode
  initialAttestations?: Attestation[]
  api?: AttestationsApi
}) {
  const [list, dispatch] = useReducer(attestationsReducer, initialAttestations)
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toISOString())
  const nextId = useRef(1)
  const shouldSeedSynchronously = initialAttestations !== undefined || (!api && isMockMode())
  const seededItems = initialAttestations ?? MOCK_ATTESTATIONS

  const defaultApiRef = useRef<AttestationsApi | null>(null)
  if (!api && !defaultApiRef.current) {
    defaultApiRef.current = shouldSeedSynchronously
      ? createMockAttestationsApi(seededItems, { pageSize: Math.max(50, seededItems.length) })
      : getDefaultAttestationsApi()
  }
  const activeApi = api ?? defaultApiRef.current!

  const [state, dispatch] = useReducer(
    attestationsReducer,
    shouldSeedSynchronously
      ? {
          ...INITIAL_ATTESTATIONS_STATE,
          items: seededItems,
          status: 'success' as const,
        }
      : {
          ...INITIAL_ATTESTATIONS_STATE,
          status: 'loading' as const,
        },
  )

  const [lastUpdated, setLastUpdated] = useState(() => new Date().toISOString())
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadInitial = useCallback(async () => {
    dispatch({ type: 'LOAD_START' })
    try {
      const result = await activeApi.listAttestations(null)
      if (!isMountedRef.current) return
      dispatch({
        type: 'LOAD_SUCCESS',
        items: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      })
      setLastUpdated(new Date().toISOString())
    } catch (err) {
      if (!isMountedRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to load attestations.'
      dispatch({ type: 'LOAD_ERROR', error: message })
    }
  }, [activeApi])

  useEffect(() => {
    if (shouldSeedSynchronously) return
    void loadInitial()
  }, [shouldSeedSynchronously, loadInitial])

  const refresh = useCallback(async () => {
    setLastUpdated(new Date().toISOString())
    await loadInitial()
  }, [loadInitial])

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoadingMore || state.status === 'loading') return
    dispatch({ type: 'LOAD_START', append: true })
    try {
      const result = await activeApi.listAttestations(state.nextCursor)
      if (!isMountedRef.current) return
      dispatch({
        type: 'APPEND',
        items: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      })
      setLastUpdated(new Date().toISOString())
    } catch (err) {
      if (!isMountedRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to load more attestations.'
      dispatch({ type: 'LOAD_ERROR', error: message })
    }
  }, [activeApi, state.hasMore, state.isLoadingMore, state.status, state.nextCursor])

  const getById = useCallback(
    (id: string) => state.items.find((attestation) => attestation.id === id),
    [state.items],
  )

  const fetchById = useCallback(
    async (id: string): Promise<Attestation | null> => {
      const existing = state.items.find((attestation) => attestation.id === id)
      if (existing) return existing

      try {
        const fetched = await activeApi.getAttestation(id)
        if (isMountedRef.current) {
          dispatch({
            type: 'APPEND',
            items: [fetched],
            nextCursor: state.nextCursor,
            hasMore: state.hasMore,
          })
        }
        return fetched
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null
        }
        throw err
      }
    },
    [activeApi, state.items, state.nextCursor, state.hasMore],
  )

  const trigger = useCallback(
    async (details: AttestationDetails) => {
      const created = await activeApi.createAttestation(details)
      if (isMountedRef.current) {
        dispatch({ type: 'trigger', attestation: created })
        setLastUpdated(new Date().toISOString())
      }
      return created
    },
    [activeApi],
  )

  const value = useMemo<AttestationsContextValue>(
    () => ({
      list: state.items,
      status: state.status,
      error: state.error,
      hasMore: state.hasMore,
      isLoadingMore: state.isLoadingMore,
      lastUpdated,
      getById,
      fetchById,
      loadMore,
      trigger,
      refresh,
    }),
    [
      state.items,
      state.status,
      state.error,
      state.hasMore,
      state.isLoadingMore,
      lastUpdated,
      getById,
      fetchById,
      loadMore,
      trigger,
      refresh,
    ],
  )

  return <AttestationsContext.Provider value={value}>{children}</AttestationsContext.Provider>
}

export function useAttestations() {
  const context = useContext(AttestationsContext)
  if (!context) {
    throw new Error('useAttestations must be used within an AttestationsProvider.')
  }
  return context
}
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
  realtimeService,
  type AttestationStatus,
  type RealtimeConnectionState,
  type RealtimeService,
  type StatusUpdate,
} from '../services/realtime'
type AttestationsState = {
  updates: StatusUpdate[]
  connectionState: RealtimeConnectionState
  error?: string
type AttestationsAction =
  | { type: 'STATUS_UPDATE'; update: StatusUpdate }
  | { type: 'CONNECTION_STATE'; state: RealtimeConnectionState; error?: Error }
  updates: StatusUpdate[]
  updatesByAttestation: Record<string, StatusUpdate[]>
  latestUpdate?: StatusUpdate
  connectionState: RealtimeConnectionState
  error?: string
const initialState: AttestationsState = {
  updates: [],
  connectionState: 'offline',
function reducer(state: AttestationsState, action: AttestationsAction): AttestationsState {
    case 'STATUS_UPDATE': {
      const existingIndex = state.updates.findIndex((update) => update.id === action.update.id)
      const updates = [...state.updates]
      if (existingIndex === -1) updates.push(action.update)
      else updates[existingIndex] = action.update
      return { ...state, updates }
    case 'CONNECTION_STATE':
      return { ...state, connectionState: action.state, error: action.error?.message }
    default:
      return state
  service = realtimeService,
  service?: RealtimeService
  const [state, dispatch] = useReducer(reducer, initialState)
  useEffect(
    () =>
      service.subscribe(
        (update) => dispatch({ type: 'STATUS_UPDATE', update }),
        (connectionState, error) => dispatch({ type: 'CONNECTION_STATE', state: connectionState, error }),
      ),
    [service],
  const value = useMemo(() => {
    const updatesByAttestation: Record<string, StatusUpdate[]> = {}
    state.updates.forEach((update) => {
      const attestationUpdates = updatesByAttestation[update.attestationId] ?? []
      attestationUpdates.push(update)
      updatesByAttestation[update.attestationId] = attestationUpdates
    })
    return {
      ...state,
      updatesByAttestation,
      latestUpdate: state.updates[state.updates.length - 1],
  }, [state])
    throw new Error('useAttestations must be used within an AttestationsProvider')
export function getStatusStep(status: AttestationStatus, step?: number) {
  if (step !== undefined) return step
  switch (status) {
    case 'collecting':
      return 1
    case 'verifying':
      return 2
    case 'building_merkle_root':
      return 3
    case 'publishing':
      return 4
    case 'verified':
      return 4
    case 'failed':
    case 'canceled':
      return 1
    case 'pending':
      return 0
