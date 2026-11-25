import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRealtimeService, type RealtimeTransport, type StatusUpdate } from './realtime'

function createTransport() {
  const connections: Array<{
    lastEventId: string | undefined
    handlers: Parameters<RealtimeTransport['connect']>[1]
    close: ReturnType<typeof vi.fn>
  }> = []
  const poll = vi.fn<RealtimeTransport['poll']>(async () => [])
  const transport: RealtimeTransport = {
    connect: vi.fn((lastEventId, handlers) => {
      const close = vi.fn()
      connections.push({ lastEventId, handlers, close })
      return close
    }),
    poll,
  }
  return { transport, connections, poll }
}

const update: StatusUpdate = {
  id: 'event-1',
  attestationId: 'attestation-1',
  status: 'verifying',
  step: 2,
}

afterEach(() => {
  vi.useRealTimers()
})

describe('realtime service', () => {
  it('pauses offline and resumes from the last received event id', () => {
    vi.useFakeTimers()
    const { transport, connections } = createTransport()
    let online = true
    const service = createRealtimeService(transport, { onlineTarget: window, isOnline: () => online })
    const onUpdate = vi.fn()
    const onStateChange = vi.fn()
    const unsubscribe = service.subscribe(onUpdate, onStateChange)

    expect(connections).toHaveLength(1)
    connections[0].handlers.onOpen()
    connections[0].handlers.onEvent(update)
    expect(onUpdate).toHaveBeenCalledWith(update)

    online = false
    window.dispatchEvent(new Event('offline'))
    expect(onStateChange).toHaveBeenLastCalledWith('offline', undefined)
    expect(connections[0].close).toHaveBeenCalledOnce()

    online = true
    window.dispatchEvent(new Event('online'))
    expect(connections).toHaveLength(2)
    expect(connections[1].lastEventId).toBe('event-1')

    unsubscribe()
  })

  it('polls after a stream failure and retries the event stream with backoff', async () => {
    vi.useFakeTimers()
    const { transport, connections, poll } = createTransport()
    const service = createRealtimeService(transport, {
      onlineTarget: window,
      isOnline: () => true,
      pollIntervalMs: 100,
      retryBaseMs: 50,
      retryMaxMs: 100,
    })
    const unsubscribe = service.subscribe(vi.fn(), vi.fn())

    connections[0].handlers.onError(new Error('stream failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(poll).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(50)
    expect(connections).toHaveLength(2)

    unsubscribe()
  })
})
