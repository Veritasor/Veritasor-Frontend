export const ATTESTATION_STATUSES = [
  'pending',
  'collecting',
  'verifying',
  'building_merkle_root',
  'publishing',
  'verified',
  'failed',
  'canceled',
] as const

export type AttestationStatus = (typeof ATTESTATION_STATUSES)[number]

export interface StatusUpdate {
  id: string
  attestationId: string
  status: AttestationStatus
  step?: number
  message?: string
  timestamp?: string
}

export type RealtimeConnectionState = 'connecting' | 'connected' | 'polling' | 'offline'

interface TransportHandlers {
  onOpen: () => void
  onEvent: (update: StatusUpdate) => void
  onError: (error: Error) => void
}

export interface RealtimeTransport {
  connect: (lastEventId: string | undefined, handlers: TransportHandlers) => () => void
  poll: (lastEventId: string | undefined) => Promise<StatusUpdate[]>
}

export interface RealtimeService {
  subscribe: (
    onUpdate: (update: StatusUpdate) => void,
    onStateChange?: (state: RealtimeConnectionState, error?: Error) => void,
  ) => () => void
}

interface RealtimeServiceOptions {
  pollIntervalMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
  onlineTarget?: Window
  isOnline?: () => boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStatusUpdate(value: unknown, fallbackId?: string): StatusUpdate {
  if (
    !isRecord(value) ||
    typeof value.attestationId !== 'string' ||
    typeof value.status !== 'string' ||
    !ATTESTATION_STATUSES.includes(value.status as AttestationStatus)
  ) {
    throw new Error('Invalid attestation status update')
  }

  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : fallbackId
  if (!id) {
    throw new Error('Attestation status update is missing an event id')
  }

  if (value.step !== undefined && (!Number.isInteger(value.step) || (value.step as number) < 1 || (value.step as number) > 4)) {
    throw new Error('Attestation status update has an invalid step')
  }

  if (value.message !== undefined && typeof value.message !== 'string') {
    throw new Error('Attestation status update has an invalid message')
  }

  if (value.timestamp !== undefined && typeof value.timestamp !== 'string') {
    throw new Error('Attestation status update has an invalid timestamp')
  }

  return {
    id,
    attestationId: value.attestationId,
    status: value.status as AttestationStatus,
    ...(value.step === undefined ? {} : { step: value.step as number }),
    ...(value.message === undefined ? {} : { message: value.message as string }),
    ...(value.timestamp === undefined ? {} : { timestamp: value.timestamp as string }),
  }
}

function createBrowserTransport(): RealtimeTransport {
  return {
    connect(lastEventId, handlers) {
      if (typeof EventSource === 'undefined') {
        throw new Error('EventSource is not available')
      }

      const query = new URLSearchParams()
      if (lastEventId) query.set('lastEventId', lastEventId)
      const eventSource = new EventSource(`/api/attestations/events${query.size ? `?${query}` : ''}`)
      eventSource.onopen = handlers.onOpen
      eventSource.onmessage = (event) => {
        try {
          handlers.onEvent(parseStatusUpdate(JSON.parse(event.data), event.lastEventId))
        } catch (error) {
          handlers.onError(error instanceof Error ? error : new Error('Unable to parse attestation event'))
        }
      }
      eventSource.onerror = () => handlers.onError(new Error('Attestation event stream disconnected'))
      return () => eventSource.close()
    },
    async poll(lastEventId) {
      const query = new URLSearchParams()
      if (lastEventId) query.set('since', lastEventId)
      const response = await fetch(`/api/attestations/status${query.size ? `?${query}` : ''}`)
      if (!response.ok) {
        throw new Error(`Attestation status polling failed (${response.status})`)
      }

      const payload: unknown = await response.json()
      const updates = Array.isArray(payload)
        ? payload
        : isRecord(payload) && Array.isArray(payload.updates)
          ? payload.updates
          : undefined
      if (!updates) {
        throw new Error('Invalid attestation status polling response')
      }
      return updates.map((update) => parseStatusUpdate(update))
    },
  }
}

export function createRealtimeService(
  transport: RealtimeTransport = createBrowserTransport(),
  options: RealtimeServiceOptions = {},
): RealtimeService {
  const pollIntervalMs = options.pollIntervalMs ?? 3000
  const retryBaseMs = options.retryBaseMs ?? 1000
  const retryMaxMs = options.retryMaxMs ?? 30000
  const onlineTarget = options.onlineTarget ?? (typeof window === 'undefined' ? undefined : window)
  const isOnline = options.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine)
  const subscribers = new Set<{
    onUpdate: (update: StatusUpdate) => void
    onStateChange?: (state: RealtimeConnectionState, error?: Error) => void
  }>()

  let lastEventId: string | undefined
  let connectionState: RealtimeConnectionState = 'offline'
  let streamCleanup: (() => void) | undefined
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let retryCount = 0
  let started = false

  const clearTimer = (timer: ReturnType<typeof setTimeout> | undefined) => {
    if (timer !== undefined) clearTimeout(timer)
  }

  const clearPolling = () => {
    clearTimer(pollTimer)
    pollTimer = undefined
  }

  const closeStream = () => {
    streamCleanup?.()
    streamCleanup = undefined
  }

  const setState = (state: RealtimeConnectionState, error?: Error) => {
    connectionState = state
    subscribers.forEach((subscriber) => subscriber.onStateChange?.(state, error))
  }

  const emit = (update: StatusUpdate) => {
    lastEventId = update.id
    subscribers.forEach((subscriber) => subscriber.onUpdate(update))
  }

  const schedulePoll = (delay: number) => {
    clearPolling()
    pollTimer = setTimeout(() => {
      pollTimer = undefined
      void poll()
    }, delay)
  }

  const poll = async () => {
    if (!started || !isOnline()) return

    try {
      const updates = await transport.poll(lastEventId)
      if (!started || !isOnline()) return
      updates.forEach(emit)
    } catch (error) {
      if (started && isOnline()) {
        setState('polling', error instanceof Error ? error : new Error('Attestation status polling failed'))
      }
    } finally {
      if (started && isOnline() && connectionState !== 'connected') {
        schedulePoll(pollIntervalMs)
      }
    }
  }

  const scheduleReconnect = () => {
    clearTimer(reconnectTimer)
    const delay = Math.min(retryBaseMs * 2 ** retryCount, retryMaxMs)
    retryCount += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, delay)
  }

  const fallback = (error: Error) => {
    if (!started) return
    closeStream()
    setState('polling', error)
    schedulePoll(0)
    scheduleReconnect()
  }

  const connect = () => {
    if (!started || !isOnline()) return
    closeStream()
    setState('connecting')
    try {
      streamCleanup = transport.connect(lastEventId, {
        onOpen: () => {
          if (!started) return
          retryCount = 0
          clearPolling()
          clearTimer(reconnectTimer)
          reconnectTimer = undefined
          setState('connected')
        },
        onEvent: emit,
        onError: fallback,
      })
    } catch (error) {
      fallback(error instanceof Error ? error : new Error('Unable to connect to attestation event stream'))
    }
  }

  const stop = () => {
    started = false
    closeStream()
    clearPolling()
    clearTimer(reconnectTimer)
    reconnectTimer = undefined
  }

  const handleOffline = () => {
    if (!started) return
    closeStream()
    clearPolling()
    clearTimer(reconnectTimer)
    reconnectTimer = undefined
    setState('offline')
  }

  const handleOnline = () => {
    if (started) connect()
  }

  return {
    subscribe(onUpdate, onStateChange) {
      const subscriber = { onUpdate, onStateChange }
      subscribers.add(subscriber)
      onStateChange?.(connectionState)

      if (!started) {
        started = true
        onlineTarget?.addEventListener('offline', handleOffline)
        onlineTarget?.addEventListener('online', handleOnline)
        if (isOnline()) connect()
        else setState('offline')
      }

      return () => {
        subscribers.delete(subscriber)
        if (subscribers.size === 0 && started) {
          stop()
          onlineTarget?.removeEventListener('offline', handleOffline)
          onlineTarget?.removeEventListener('online', handleOnline)
        }
      }
    },
  }
}

export const realtimeService = createRealtimeService()
