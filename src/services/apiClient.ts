export interface ApiErrorOptions {
  status: number
  code: string
  message: string
  retryable: boolean
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryable: boolean
  readonly cause?: unknown

  constructor({ status, code, message, retryable, cause }: ApiErrorOptions) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryable = retryable
    if (cause !== undefined) {
      this.cause = cause
    }
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export type ResponseParseMode = 'json' | 'text' | 'void'

export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
  cache?: RequestCache
  credentials?: RequestCredentials
  baseUrl?: string
  parseAs?: ResponseParseMode
}

export const DEFAULT_TIMEOUT_MS = 15_000

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL
  return typeof configured === 'string' ? configured.replace(/\/+$/, '') : ''
}

export function resolveRequestUrl(path: string, baseUrl?: string): string {
  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path
  }
  const base = (baseUrl !== undefined ? baseUrl : getApiBaseUrl()).replace(/\/+$/, '')
  if (!base) {
    return path
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase()
  return Object.keys(headers).some((key) => key.toLowerCase() === lower)
}

async function parseErrorBody(
  res: Response,
  fallbackStatus: number,
  fallbackStatusText: string,
): Promise<{ message: string; code: string }> {
  const defaultCode = `HTTP_${fallbackStatus}`
  const defaultMessage = fallbackStatusText || `Request failed with status ${fallbackStatus}`

  const contentType = res.headers?.get?.('content-type') || ''

  if (contentType.includes('application/json') && typeof res.json === 'function') {
    try {
      const data: unknown = await res.json()
      if (data && typeof data === 'object') {
        const record = data as Record<string, unknown>
        const message =
          typeof record.message === 'string' && record.message.trim()
            ? record.message
            : typeof record.error === 'string' && record.error.trim()
              ? record.error
              : defaultMessage
        const code =
          typeof record.code === 'string' && record.code.trim()
            ? record.code
            : defaultCode
        return { message, code }
      }
    } catch {
      return { message: defaultMessage, code: defaultCode }
    }
  }

  if (typeof res.text === 'function') {
    try {
      const text = (await res.text()).trim()
      if (text) {
        return { message: text, code: defaultCode }
      }
    } catch {
      // ignore body read errors
    }
  }

  return { message: defaultMessage, code: defaultCode }
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    headers: callerHeaders,
    body,
    signal: callerSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache,
    credentials,
    baseUrl,
    parseAs,
  } = options

  const url = resolveRequestUrl(path, baseUrl)
  const headers: Record<string, string> = callerHeaders ? { ...callerHeaders } : {}

  let requestBody: BodyInit | undefined
  if (body !== undefined && body !== null) {
    if (body instanceof FormData || typeof body === 'string') {
      requestBody = body
    } else {
      requestBody = JSON.stringify(body)
      if (!hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/json'
      }
    }
  }

  const controller = new AbortController()
  let timedOut = false

  if (callerSignal?.aborted) {
    throw new ApiError({
      status: 0,
      code: 'ABORTED',
      message: 'Request was aborted',
      retryable: false,
    })
  }

  const onCallerAbort = () => {
    controller.abort()
  }

  if (callerSignal) {
    callerSignal.addEventListener('abort', onCallerAbort, { once: true })
  }

  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeoutMs)
      : undefined

  const init: RequestInit = {
    method,
    signal: controller.signal,
  }

  if (Object.keys(headers).length > 0) {
    init.headers = headers
  }
  if (requestBody !== undefined) {
    init.body = requestBody
  }
  if (cache !== undefined) {
    init.cache = cache
  }
  if (credentials !== undefined) {
    init.credentials = credentials
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    if (timedOut) {
      throw new ApiError({
        status: 0,
        code: 'TIMEOUT',
        message: `Request timed out after ${timeoutMs}ms`,
        retryable: true,
        cause: err,
      })
    }
    if (callerSignal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw new ApiError({
        status: 0,
        code: 'ABORTED',
        message: 'Request was aborted',
        retryable: false,
        cause: err,
      })
    }
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network error',
      retryable: true,
      cause: err,
    })
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    if (callerSignal) {
      callerSignal.removeEventListener('abort', onCallerAbort)
    }
  }

  if (!res.ok) {
    const status = typeof res.status === 'number' ? res.status : 0
    const statusText = typeof res.statusText === 'string' ? res.statusText : ''
    const { message, code } = await parseErrorBody(res, status, statusText)
    throw new ApiError({
      status,
      code,
      message,
      retryable: isRetryableStatus(status),
    })
  }

  const upperMethod = method.toUpperCase()
  const effectiveParseAs: ResponseParseMode =
    parseAs ?? (upperMethod === 'HEAD' || res.status === 204 ? 'void' : 'json')

  if (effectiveParseAs === 'void') {
    return undefined as T
  }

  if (effectiveParseAs === 'text') {
    return (await res.text()) as T
  }

  const contentType = res.headers?.get?.('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new ApiError({
      status: res.status,
      code: 'INVALID_RESPONSE',
      message: 'Invalid response from server: expected JSON response.',
      retryable: false,
    })
  }

  try {
    return (await res.json()) as T
  } catch (err) {
    throw new ApiError({
      status: res.status,
      code: 'INVALID_RESPONSE',
      message: 'Invalid response from server: failed to parse JSON response.',
      retryable: false,
      cause: err,
    })
  }
}
