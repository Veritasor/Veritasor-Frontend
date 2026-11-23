import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from './useOnlineStatus'

const MUTATION_QUEUE_KEY = 'veritasor-mutation-queue-v1'

export interface MutationOptions<TVariables, TContext = undefined> {
  mutationKey: string
  mutationFn: (variables: TVariables) => Promise<unknown>
  onMutate?: (variables: TVariables) => TContext
  onError?: (error: Error, variables: TVariables, context: TContext) => void
}

export type MutationStatus = 'idle' | 'pending' | 'queued' | 'success' | 'error'

export interface MutationResult<TVariables> {
  mutate: (variables: TVariables) => Promise<void>
  status: MutationStatus
  error: Error | null
}

interface QueueItem {
  id: string
  mutationKey: string
  variables: SerializedValue
  context: SerializedValue
}

interface SerializedValue {
  isUndefined: boolean
  value: unknown
}

interface MutationHandler {
  execute: (item: QueueItem) => Promise<void>
}

const handlers = new Map<string, MutationHandler>()
let isReplaying = false

function readQueue(): QueueItem[] {
  const raw = localStorage.getItem(MUTATION_QUEUE_KEY)
  if (!raw) return []

  const parsed: unknown = JSON.parse(raw)
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.mutationKey === 'string' &&
        item.variables !== null &&
        typeof item.variables === 'object' &&
        typeof item.variables.isUndefined === 'boolean' &&
        'value' in item.variables &&
        item.context !== null &&
        typeof item.context === 'object' &&
        typeof item.context.isUndefined === 'boolean' &&
        'value' in item.context,
    )
  ) {
    throw new Error('The saved mutation queue is invalid.')
  }
  return parsed as QueueItem[]
}

function writeQueue(queue: QueueItem[]): void {
  if (queue.length === 0) {
    localStorage.removeItem(MUTATION_QUEUE_KEY)
    return
  }
  localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue))
}

function serialize(value: unknown): SerializedValue {
  if (value === undefined) return { isUndefined: true, value: null }
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new Error('Queued mutations must use serializable variables and context.')
  }
  return { isUndefined: false, value: JSON.parse(serialized) as unknown }
}

function deserialize(value: SerializedValue): unknown {
  return value.isUndefined ? undefined : value.value
}

async function replayQueue(): Promise<void> {
  if (isReplaying) return
  isReplaying = true
  try {
    while (navigator.onLine) {
      const queue = readQueue()
      if (queue.length === 0) return

      const nextIndex = queue.findIndex((item) => handlers.has(item.mutationKey))
      if (nextIndex === -1) return

      const item = queue[nextIndex]
      const handler = handlers.get(item.mutationKey)
      if (!handler) continue

      await handler.execute(item)
      queue.splice(nextIndex, 1)
      writeQueue(queue)
    }
  } finally {
    isReplaying = false
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export function useMutation<TVariables, TContext = undefined>(
  options: MutationOptions<TVariables, TContext>,
): MutationResult<TVariables> {
  const { isOnline } = useOnlineStatus()
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [status, setStatus] = useState<MutationStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (variables: TVariables, context: TContext) => {
    try {
      await optionsRef.current.mutationFn(variables)
      setStatus('success')
    } catch (reason) {
      const mutationError = toError(reason)
      optionsRef.current.onError?.(mutationError, variables, context)
      setError(mutationError)
      setStatus('error')
    }
  }, [])

  const queueHandler = useRef<MutationHandler | null>(null)
  queueHandler.current = {
    execute: async (item) => {
      setStatus('pending')
      await execute(
        deserialize(item.variables) as TVariables,
        deserialize(item.context) as TContext,
      )
    },
  }

  useEffect(() => {
    const handler = queueHandler.current
    if (!handler) return
    handlers.set(options.mutationKey, handler)
    try {
      for (const item of readQueue()) {
        if (item.mutationKey === options.mutationKey) {
          optionsRef.current.onMutate?.(
            deserialize(item.variables) as TVariables,
          )
        }
      }
    } catch (reason) {
      setError(toError(reason))
      setStatus('error')
    }
    return () => {
      if (handlers.get(options.mutationKey) === handler) {
        handlers.delete(options.mutationKey)
      }
    }
  }, [options.mutationKey])

  useEffect(() => {
    if (!isOnline) return
    void replayQueue().catch((reason: unknown) => {
      setError(toError(reason))
      setStatus('error')
    })
  }, [isOnline])

  const mutate = useCallback(
    async (variables: TVariables) => {
      const currentOptions = optionsRef.current
      const context = currentOptions.onMutate?.(variables) as TContext
      setError(null)
      setStatus('pending')

      if (!isOnline) {
        try {
          const item: QueueItem = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            mutationKey: currentOptions.mutationKey,
            variables: serialize(variables),
            context: serialize(context),
          }
          writeQueue([...readQueue(), item])
          setStatus('queued')
        } catch (reason) {
          const mutationError = toError(reason)
          currentOptions.onError?.(mutationError, variables, context)
          setError(mutationError)
          setStatus('error')
        }
        return
      }

      await execute(variables, context)
    },
    [execute, isOnline],
  )

  return { mutate, status, error }
}
