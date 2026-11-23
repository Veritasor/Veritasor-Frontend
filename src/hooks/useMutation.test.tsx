import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMutation } from './useMutation'

const QUEUE_KEY = 'veritasor-mutation-queue-v1'

afterEach(() => {
  localStorage.removeItem(QUEUE_KEY)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useMutation', () => {
  it('rolls back optimistic state after a failed mutation', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    let value = 'before'
    const rollback = vi.fn()
    const { result } = renderHook(() =>
      useMutation({
        mutationKey: 'test-rollback',
        mutationFn: vi.fn().mockRejectedValue(new Error('request failed')),
        onMutate: (next: string) => {
          const previous = value
          value = next
          return previous
        },
        onError: (error, _next, previous) => {
          value = previous
          rollback(error)
        },
      }),
    )

    await act(async () => {
      await result.current.mutate('optimistic')
    })

    expect(value).toBe('before')
    expect(rollback).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'request failed' }),
    )
    expect(result.current.status).toBe('error')
    expect(result.current.error?.message).toBe('request failed')
  })

  it('hydrates and replays persisted mutations after remounting', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const mutationFn = vi.fn().mockResolvedValue(undefined)
    const options = {
      mutationKey: 'test-replay-after-remount',
      mutationFn,
      onMutate: (value: string) => `previous ${value}`,
    }
    const firstRender = renderHook(() => useMutation(options))

    await act(async () => {
      await firstRender.result.current.mutate('value')
    })
    expect(firstRender.result.current.status).toBe('queued')
    expect(mutationFn).not.toHaveBeenCalled()
    firstRender.unmount()

    const { result } = renderHook(() => useMutation(options))
    expect(JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')).toHaveLength(1)

    vi.stubGlobal('navigator', { onLine: true })
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => expect(mutationFn).toHaveBeenCalledWith('value'))
    await waitFor(() => expect(localStorage.getItem(QUEUE_KEY)).toBeNull())
    await waitFor(() => expect(result.current.status).toBe('success'))
  })
})
