import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  submitOnboardingApplication,
  uploadWithProgress,
  validateOnboardingFile,
  validateOnboardingFiles,
  fetchOnboardingDraft,
  syncOnboardingDraft,
  OnboardingSubmitError,
  isAbortError,
  MAX_FILE_SIZE_BYTES,
  type UploadProgress,
} from './onboardingApi'
import type { OnboardingDraft } from '../hooks/useOnboardingDraft'
import type { FileMap } from '../pages/onboarding/DocumentUploadStep'

class FakeXHR {
  static instances: FakeXHR[] = []
  method = ''
  url = ''
  async = true
  requestHeaders: Record<string, string> = {}
  body: FormData | null = null
  status = 0
  statusText = ''
  responseText = ''
  responseHeaders: Record<string, string> = {}
  aborted = false

  upload: { onprogress: ((ev: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    FakeXHR.instances.push(this)
  }

  open(method: string, url: string, async = true) {
    this.method = method
    this.url = url
    this.async = async
  }

  setRequestHeader(key: string, value: string) {
    this.requestHeaders[key] = value
  }

  getResponseHeader(key: string): string | null {
    const lower = key.toLowerCase()
    for (const [k, v] of Object.entries(this.responseHeaders)) {
      if (k.toLowerCase() === lower) return v
    }
    return null
  }

  send(body: FormData) {
    this.body = body
  }

  abort() {
    this.aborted = true
    this.onabort?.()
  }

  emitProgress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable } as ProgressEvent)
  }

  respond(status: number, body: string, headers: Record<string, string> = { 'content-type': 'application/json' }, statusText = '') {
    this.status = status
    this.statusText = statusText
    this.responseText = body
    this.responseHeaders = headers
    this.onload?.()
  }

  failNetwork() {
    this.onerror?.()
  }
}

const sampleDraft: OnboardingDraft = {
  version: 1,
  step: 6,
  business: {
    legalName: 'Acme Corp',
    registrationNumber: 'RC-12345',
    country: 'USA',
    businessType: 'LLC',
    website: 'https://acme.com',
  },
  owner: {
    fullName: 'Jane Doe',
    dateOfBirth: '1985-05-15',
    nationality: 'American',
    addressLine1: '123 Main St',
    addressLine2: '',
    city: 'New York',
    postalCode: '10001',
  },
  selfie: {
    captured: true,
    fileName: 'selfie.jpg',
  },
  documents: {
    registrationCert: ['reg.pdf'],
    govIdFront: ['id-front.jpg'],
    govIdBack: ['id-back.jpg'],
    proofOfAddress: ['proof.pdf'],
  },
  bank: {
    bankName: 'First Bank',
    accountNumber: '987654321',
    ibanSwift: 'FBUS123',
    currency: 'USD',
  },
}

const emptyFiles: FileMap = {
  registrationCert: [],
  govIdFront: [],
  govIdBack: [],
  proofOfAddress: [],
}

describe('onboardingApi', () => {
  beforeEach(() => {
    FakeXHR.instances = []
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('uploadWithProgress', () => {
    it('reports uploaded byte progress and resolves JSON response', async () => {
      const formData = new FormData()
      formData.append('draft', '{}')
      const progressEvents: UploadProgress[] = []

      const promise = uploadWithProgress(formData, {
        url: '/api/onboarding/submit',
        headers: { 'Idempotency-Key': 'idem-123' },
        onProgress: (p) => progressEvents.push(p),
      })

      expect(FakeXHR.instances).toHaveLength(1)
      const xhr = FakeXHR.instances[0]
      expect(xhr.method).toBe('POST')
      expect(xhr.url).toBe('/api/onboarding/submit')
      expect(xhr.requestHeaders['Idempotency-Key']).toBe('idem-123')

      xhr.emitProgress(250, 1000)
      xhr.emitProgress(750, 1000)
      xhr.emitProgress(1000, 1000)
      xhr.respond(200, JSON.stringify({ success: true, id: 'app-1' }))

      const result = await promise
      expect(result).toEqual({ success: true, id: 'app-1' })
      expect(progressEvents).toEqual([
        { loaded: 250, total: 1000, percent: 25 },
        { loaded: 750, total: 1000, percent: 75 },
        { loaded: 1000, total: 1000, percent: 100 },
      ])
    })

    it('aborts the XHR when AbortSignal fires', async () => {
      const controller = new AbortController()
      const formData = new FormData()
      const promise = uploadWithProgress(formData, { signal: controller.signal })

      const xhr = FakeXHR.instances[0]
      controller.abort()

      expect(xhr.aborted).toBe(true)
      await expect(promise).rejects.toSatisfy((err: unknown) => isAbortError(err))
    })

    it('rejects immediately if AbortSignal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      await expect(
        uploadWithProgress(new FormData(), { signal: controller.signal }),
      ).rejects.toSatisfy((err: unknown) => isAbortError(err))
      expect(FakeXHR.instances).toHaveLength(0)
    })
  })

  describe('submitOnboardingApplication', () => {
    it('submits multipart/form-data with draft, selfie, document files, and Idempotency-Key', async () => {
      const selfieFile = new File(['selfie-content'], 'selfie.jpg', { type: 'image/jpeg' })
      const regFile = new File(['reg-content'], 'reg.pdf', { type: 'application/pdf' })
      const frontFile = new File(['front-content'], 'id-front.jpg', { type: 'image/jpeg' })
      const backFile = new File(['back-content'], 'id-back.jpg', { type: 'image/jpeg' })
      const proofFile = new File(['proof-content'], 'proof.pdf', { type: 'application/pdf' })

      const documentFiles: FileMap = {
        registrationCert: [regFile],
        govIdFront: [frontFile],
        govIdBack: [backFile],
        proofOfAddress: [proofFile],
      }

      const promise = submitOnboardingApplication({
        draft: sampleDraft,
        selfieFile,
        documentFiles,
        idempotencyKey: 'key-abc-123',
      })

      const xhr = FakeXHR.instances[0]
      expect(xhr.method).toBe('POST')
      expect(xhr.url).toBe('/api/onboarding/submit')
      expect(xhr.requestHeaders['Idempotency-Key']).toBe('key-abc-123')

      const sentBody = xhr.body!
      expect(sentBody).toBeInstanceOf(FormData)
      const parsedDraft = JSON.parse(sentBody.get('draft') as string)
      expect(parsedDraft.status).toBe('pending_review')
      expect(parsedDraft.business.legalName).toBe('Acme Corp')
      expect(sentBody.get('selfie')).toBe(selfieFile)
      expect(sentBody.getAll('registrationCert')).toEqual([regFile])
      expect(sentBody.getAll('govIdFront')).toEqual([frontFile])
      expect(sentBody.getAll('govIdBack')).toEqual([backFile])
      expect(sentBody.getAll('proofOfAddress')).toEqual([proofFile])

      xhr.respond(200, JSON.stringify({ success: true, id: 'app-123' }))
      await expect(promise).resolves.toEqual({ success: true, id: 'app-123' })
    })

    it('reuses the same Idempotency-Key across retries so applications are not duplicated', async () => {
      const idempotencyKey = 'stable-retry-key'

      const firstAttempt = submitOnboardingApplication({
        draft: sampleDraft,
        selfieFile: null,
        documentFiles: emptyFiles,
        idempotencyKey,
      })
      FakeXHR.instances[0].failNetwork()
      await expect(firstAttempt).rejects.toThrow(/Network error/i)

      const secondAttempt = submitOnboardingApplication({
        draft: sampleDraft,
        selfieFile: null,
        documentFiles: emptyFiles,
        idempotencyKey,
      })
      FakeXHR.instances[1].respond(200, JSON.stringify({ success: true, id: 'app-123' }))
      await expect(secondAttempt).resolves.toEqual({ success: true, id: 'app-123' })

      expect(FakeXHR.instances[0].requestHeaders['Idempotency-Key']).toBe(idempotencyKey)
      expect(FakeXHR.instances[1].requestHeaders['Idempotency-Key']).toBe(idempotencyKey)
    })

    it('surfaces per-file errors from server 422 response', async () => {
      const promise = submitOnboardingApplication({
        draft: sampleDraft,
        selfieFile: null,
        documentFiles: emptyFiles,
      })

      FakeXHR.instances[0].respond(
        422,
        JSON.stringify({
          message: 'Document validation failed',
          fileErrors: { govIdFront: 'Image is too blurry' },
        }),
        { 'content-type': 'application/json' },
        'Unprocessable Entity',
      )

      try {
        await promise
        expect.fail('Expected error')
      } catch (err) {
        expect(err).toBeInstanceOf(OnboardingSubmitError)
        const submitErr = err as OnboardingSubmitError
        expect(submitErr.status).toBe(422)
        expect(submitErr.fileErrors).toEqual({ govIdFront: 'Image is too blurry' })
      }
    })

    it('throws an error on 500 response', async () => {
      const promise = submitOnboardingApplication({
        draft: sampleDraft,
        selfieFile: null,
        documentFiles: emptyFiles,
      })
      FakeXHR.instances[0].respond(500, 'Internal Server Error', { 'content-type': 'text/plain' }, 'Internal Server Error')

      await expect(promise).rejects.toThrow(/Submission failed with status 500/)
    })

    it('throws an error on network error', async () => {
      const promise = submitOnboardingApplication({
        draft: sampleDraft,
        selfieFile: null,
        documentFiles: emptyFiles,
      })
      FakeXHR.instances[0].failNetwork()

      await expect(promise).rejects.toThrow(/Network error/i)
    })

    it('throws an error on HTML 200 response (SPA rewrite)', async () => {
      const promise = submitOnboardingApplication({
        draft: sampleDraft,
        selfieFile: null,
        documentFiles: emptyFiles,
      })
      FakeXHR.instances[0].respond(200, '<!DOCTYPE html><html><body>Index</body></html>', { 'content-type': 'text/html' })

      await expect(promise).rejects.toThrow(/expected JSON response/i)
    })

    it('rejects invalid file type/size client-side before sending XHR', async () => {
      const badFile = new File(['malware'], 'script.exe', { type: 'application/x-msdownload' })
      const documentFiles: FileMap = {
        ...emptyFiles,
        registrationCert: [badFile],
      }

      await expect(
        submitOnboardingApplication({
          draft: sampleDraft,
          selfieFile: null,
          documentFiles,
        }),
      ).rejects.toThrow(/failed validation/i)
      expect(FakeXHR.instances).toHaveLength(0)
    })
  })

  describe('file validation helpers', () => {
    it('rejects unsupported file types with a clear message', () => {
      const badFile = new File(['data'], 'doc.txt', { type: 'text/plain' })
      const err = validateOnboardingFile(badFile)
      expect(err).toContain('Unsupported file type')
      expect(err).toContain('PDF, JPG, or PNG')
    })

    it('rejects oversized files with a clear message', () => {
      const bigFile = new File(['x'], 'huge.pdf', { type: 'application/pdf' })
      Object.defineProperty(bigFile, 'size', { value: MAX_FILE_SIZE_BYTES + 1 })
      const err = validateOnboardingFile(bigFile)
      expect(err).toContain('exceeds the 10 MB limit')
    })

    it('validates all files and returns per-field errors', () => {
      const badSelfie = new File(['pdf'], 'selfie.pdf', { type: 'application/pdf' })
      const errors = validateOnboardingFiles(badSelfie, emptyFiles)
      expect(errors.selfie).toContain('JPG or PNG')
    })
  })

  describe('draft sync API', () => {
    it('fetches remote draft when server returns 200 JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ draft: sampleDraft, updatedAt: 1700000000000 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      const res = await fetchOnboardingDraft()
      expect(res).toEqual({ draft: sampleDraft, updatedAt: 1700000000000 })
    })

    it('handles 409 conflict on PUT /api/onboarding/draft', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ draft: sampleDraft, updatedAt: 1700000005000 }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      const res = await syncOnboardingDraft(sampleDraft, 1700000001000)
      expect(res?.conflict).toBe(true)
      expect(res?.serverDraft?.updatedAt).toBe(1700000005000)
    })
  })
})
