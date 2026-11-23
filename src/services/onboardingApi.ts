import type { OnboardingDraft } from '../hooks/useOnboardingDraft'
import type { FileMap } from '../pages/onboarding/DocumentUploadStep'

export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const ALLOWED_SELFIE_TYPES = ['image/jpeg', 'image/png'] as const
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export interface UploadWithProgressOptions {
  url?: string
  method?: string
  headers?: Record<string, string>
  onProgress?: (progress: UploadProgress) => void
  signal?: AbortSignal
}

export interface SubmitOnboardingPayload {
  draft: OnboardingDraft
  selfieFile: File | null
  documentFiles: FileMap
  idempotencyKey?: string
  onProgress?: (progress: UploadProgress) => void
  signal?: AbortSignal
  retryFiles?: string[]
}

export interface RemoteDraftResponse {
  draft: Partial<OnboardingDraft>
  updatedAt: number
}

export interface SyncDraftResult {
  updatedAt: number
  conflict?: boolean
  serverDraft?: RemoteDraftResponse
}

export class OnboardingSubmitError extends Error {
  readonly status: number
  readonly fileErrors: Record<string, string>

  constructor(message: string, options: { status?: number; fileErrors?: Record<string, string> } = {}) {
    super(message)
    this.name = 'OnboardingSubmitError'
    this.status = options.status ?? 0
    this.fileErrors = options.fileErrors ?? {}
    Object.setPrototypeOf(this, OnboardingSubmitError.prototype)
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateOnboardingFile(
  file: File,
  options: {
    allowedTypes?: readonly string[]
    maxBytes?: number
    allowedLabel?: string
  } = {},
): string | null {
  const allowedTypes = options.allowedTypes ?? ALLOWED_DOCUMENT_TYPES
  const maxBytes = options.maxBytes ?? MAX_FILE_SIZE_BYTES
  const allowedLabel = options.allowedLabel ?? (allowedTypes.includes('application/pdf') ? 'PDF, JPG, or PNG' : 'JPG or PNG')

  if (!allowedTypes.includes(file.type)) {
    return `${file.name}: Unsupported file type (${file.type || 'unknown'}). Allowed: ${allowedLabel}.`
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    return `${file.name}: File size (${formatFileSize(file.size)}) exceeds the ${maxMb} MB limit.`
  }

  return null
}

export function validateOnboardingFiles(
  selfieFile: File | null,
  documentFiles: FileMap,
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (selfieFile) {
    const err = validateOnboardingFile(selfieFile, {
      allowedTypes: ALLOWED_SELFIE_TYPES,
      allowedLabel: 'JPG or PNG',
    })
    if (err) errors.selfie = err
  }

  const docKeys: (keyof FileMap)[] = ['registrationCert', 'govIdFront', 'govIdBack', 'proofOfAddress']
  for (const key of docKeys) {
    const files = documentFiles[key] || []
    const fieldErrors: string[] = []
    for (const file of files) {
      const err = validateOnboardingFile(file)
      if (err) fieldErrors.push(err)
    }
    if (fieldErrors.length > 0) {
      errors[key] = fieldErrors.join('; ')
    }
  }

  return errors
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ob-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function createAbortError(message = 'Upload cancelled'): Error {
  const err = new Error(message)
  err.name = 'AbortError'
  return err
}

function parseServerErrorPayload(responseText: string): {
  message?: string
  fileErrors?: Record<string, string>
} {
  if (!responseText) return {}
  try {
    const parsed: unknown = JSON.parse(responseText)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const record = parsed as Record<string, unknown>
    const message =
      typeof record.message === 'string' && record.message.trim()
        ? record.message.trim()
        : typeof record.error === 'string' && record.error.trim()
          ? record.error.trim()
          : undefined

    const rawFileErrors = record.fileErrors ?? record.errors
    let fileErrors: Record<string, string> | undefined
    if (rawFileErrors && typeof rawFileErrors === 'object' && !Array.isArray(rawFileErrors)) {
      const entries = Object.entries(rawFileErrors as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0,
      )
      if (entries.length > 0) {
        fileErrors = Object.fromEntries(entries)
      }
    }

    return { message, fileErrors }
  } catch {
    return {}
  }
}

export function uploadWithProgress(
  formData: FormData,
  options: UploadWithProgressOptions = {},
): Promise<unknown> {
  const {
    url = '/api/onboarding/submit',
    method = 'POST',
    headers,
    onProgress,
    signal,
  } = options

  if (signal?.aborted) {
    return Promise.reject(createAbortError())
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let settled = false

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', handleAbort)
      }
    }

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const succeed = (data: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(data)
    }

    const handleAbort = () => {
      xhr.abort()
      fail(createAbortError())
    }

    if (signal) {
      signal.addEventListener('abort', handleAbort, { once: true })
    }

    xhr.open(method, url, true)

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value)
      }
    }

    if (xhr.upload) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        const loaded = typeof event.loaded === 'number' ? event.loaded : 0
        const total = event.lengthComputable && typeof event.total === 'number' ? event.total : 0
        const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
        onProgress?.({ loaded, total, percent })
      }
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        const { message, fileErrors } = parseServerErrorPayload(xhr.responseText || '')
        const detail = message || xhr.statusText || 'Server error'
        fail(
          new OnboardingSubmitError(`Submission failed with status ${xhr.status}: ${detail}`, {
            status: xhr.status,
            fileErrors,
          }),
        )
        return
      }

      const contentType = xhr.getResponseHeader('content-type') || ''
      if (!contentType.includes('application/json')) {
        fail(new Error('Invalid response from server: expected JSON response.'))
        return
      }

      try {
        const data: unknown = JSON.parse(xhr.responseText)
        succeed(data)
      } catch {
        fail(new Error('Invalid response from server: failed to parse JSON response.'))
      }
    }

    xhr.onerror = () => {
      fail(
        new Error(
          'Network error: unable to submit onboarding application. Please check your connection and try again.',
        ),
      )
    }

    xhr.onabort = () => {
      fail(createAbortError())
    }

    xhr.send(formData)
  })
}

export async function submitOnboardingApplication({
  draft,
  selfieFile,
  documentFiles,
  idempotencyKey,
  onProgress,
  signal,
  retryFiles,
}: SubmitOnboardingPayload): Promise<unknown> {
  const validationErrors = validateOnboardingFiles(selfieFile, documentFiles)
  if (Object.keys(validationErrors).length > 0) {
    throw new OnboardingSubmitError('One or more files failed validation. Please review and try again.', {
      status: 0,
      fileErrors: validationErrors,
    })
  }

  const formData = new FormData()
  const draftJson = JSON.stringify({ ...draft, status: 'pending_review' })
  formData.append('draft', draftJson)

  const retrySet = retryFiles && retryFiles.length > 0 ? new Set(retryFiles) : null

  if (selfieFile && (!retrySet || retrySet.has('selfie'))) {
    formData.append('selfie', selfieFile)
  }

  const docKeys: (keyof FileMap)[] = ['registrationCert', 'govIdFront', 'govIdBack', 'proofOfAddress']
  for (const key of docKeys) {
    if (retrySet && !retrySet.has(key)) continue
    const files = documentFiles[key] || []
    for (const file of files) {
      formData.append(key, file)
    }
  }

  const key = idempotencyKey || generateIdempotencyKey()

  return uploadWithProgress(formData, {
    url: '/api/onboarding/submit',
    method: 'POST',
    headers: {
      'Idempotency-Key': key,
    },
    onProgress,
    signal,
  })
}

export async function fetchOnboardingDraft(signal?: AbortSignal): Promise<RemoteDraftResponse | null> {
  if (typeof fetch !== 'function') return null
  try {
    const res = await fetch('/api/onboarding/draft', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!res || !res.ok) return null
    const contentType = res.headers?.get?.('content-type') || ''
    if (!contentType.includes('application/json')) return null
    const data: unknown = await res.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    const record = data as Record<string, unknown>
    if (
      record.draft &&
      typeof record.draft === 'object' &&
      !Array.isArray(record.draft) &&
      typeof record.updatedAt === 'number' &&
      Number.isFinite(record.updatedAt)
    ) {
      return {
        draft: record.draft as Partial<OnboardingDraft>,
        updatedAt: record.updatedAt,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function syncOnboardingDraft(
  draft: OnboardingDraft,
  updatedAt: number,
  signal?: AbortSignal,
): Promise<SyncDraftResult | null> {
  if (typeof fetch !== 'function') return null
  try {
    const res = await fetch('/api/onboarding/draft', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ draft, updatedAt }),
      signal,
    })
    if (!res) return null

    if (res.status === 409) {
      const contentType = res.headers?.get?.('content-type') || ''
      if (contentType.includes('application/json')) {
        const data: unknown = await res.json()
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const record = data as Record<string, unknown>
          if (
            record.draft &&
            typeof record.draft === 'object' &&
            !Array.isArray(record.draft) &&
            typeof record.updatedAt === 'number'
          ) {
            return {
              updatedAt: record.updatedAt,
              conflict: true,
              serverDraft: {
                draft: record.draft as Partial<OnboardingDraft>,
                updatedAt: record.updatedAt,
              },
            }
          }
        }
      }
      return { updatedAt, conflict: true }
    }

    if (!res.ok) return null
    const contentType = res.headers?.get?.('content-type') || ''
    if (contentType.includes('application/json')) {
      const data: unknown = await res.json()
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const record = data as Record<string, unknown>
        if (typeof record.updatedAt === 'number') {
          return { updatedAt: record.updatedAt }
        }
      }
    }
    return { updatedAt }
  } catch {
    return null
  }
}
