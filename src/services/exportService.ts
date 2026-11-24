import {
  FORMAT_SAMPLE,
  type ExportFormat,
  type ExportJob,
  type ExportJobStatus,
  type ExportScope,
} from '../components/data-export/exportTypes'
import { MOCK_ATTESTATIONS } from '../state/attestationMocks'
import type { Attestation } from '../state/attestations'
import { newId } from '../utils/secureRandom'
import { toCsv } from '../utils/csv'

export const EXPORT_COLUMNS = [
  { id: 'id', label: 'Record ID' },
  { id: 'created_at', label: 'Created at' },
  { id: 'provider', label: 'Provider' },
  { id: 'gross_amount', label: 'Gross amount' },
  { id: 'net_amount', label: 'Net amount' },
  { id: 'currency', label: 'Currency' },
  { id: 'fee', label: 'Processing fee' },
  { id: 'attestation_id', label: 'Attestation ID' },
  { id: 'merkle_root', label: 'Merkle root' },
  { id: 'published_at', label: 'Published at' },
  { id: 'status', label: 'Status' },
  { id: 'workspace_id', label: 'Workspace ID' },
  { id: 'actor', label: 'Actor' },
  { id: 'source_ref', label: 'Source reference' },
] as const

export type ExportColumnId = (typeof EXPORT_COLUMNS)[number]['id']

export type ExportRecord = Record<ExportColumnId, string>

export interface ExportJobRequest {
  format: ExportFormat
  scope: ExportScope
  notifyEmail?: string | null
  columns?: readonly string[]
  dateFrom?: string
  dateTo?: string
}

export interface ExportServiceOptions {
  tickMs?: number
  progressStep?: number
  attestations?: readonly Attestation[]
  failFirstAttempts?: number
  now?: () => number
  retentionMs?: number
}

export interface ExportService {
  createJob: (request: ExportJobRequest) => ExportJob
  getJob: (id: string) => ExportJob | null
  cancelJob: (id: string) => ExportJob | null
  retryJob: (id: string) => ExportJob | null
  getFile: (id: string) => Blob | null
  stop: () => void
  dispose: () => void
}

export interface PollOptions {
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
}

export interface PollHandle {
  stop: () => void
}

interface InternalJob {
  job: ExportJob
  request: ExportJobRequest
  attempt: number
  shouldFail: boolean
  timer?: ReturnType<typeof setInterval>
  file?: Blob
}

const THIRTY_DAYS_MS = 30 * 86_400_000
const DEFAULT_RETENTION_MS = 7 * 86_400_000

export function isTerminalJobStatus(status: ExportJobStatus): boolean {
  return status === 'ready' || status === 'failed' || status === 'expired'
}

function legacyFileSize(scope: ExportScope): string {
  return scope === 'all' ? '24 MB' : '2.4 MB'
}

function selectedColumns(columns?: readonly string[]) {
  if (!columns || columns.length === 0) return EXPORT_COLUMNS
  return EXPORT_COLUMNS.filter((column) => columns.includes(column.id))
}

function toExportRecords(
  attestations: readonly Attestation[],
  request: ExportJobRequest,
): ExportRecord[] {
  const timestamps = attestations.map((attestation) => new Date(attestation.createdAt).getTime())
  const referenceTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now()

  let filtered = attestations.filter((attestation) => {
    const date = attestation.createdAt.slice(0, 10)
    if (request.dateFrom && date < request.dateFrom) return false
    if (request.dateTo && date > request.dateTo) return false
    return true
  })

  if (request.scope === 'current-filter') {
    filtered = filtered.slice(0, 10)
  } else if (request.scope === 'last-30-days') {
    filtered = filtered.filter(
      (attestation) => referenceTime - new Date(attestation.createdAt).getTime() <= THIRTY_DAYS_MS,
    )
  }

  return filtered.map((attestation) => ({
    id: attestation.id,
    created_at: attestation.createdAt,
    provider: attestation.source,
    gross_amount: attestation.totalRevenue,
    net_amount: attestation.totalRevenue,
    currency: attestation.currency,
    fee: '0.00',
    attestation_id: attestation.id,
    merkle_root: attestation.merkleRoot,
    published_at: attestation.status === 'verified' ? attestation.timestamp : '',
    status: attestation.status,
    workspace_id: 'demo-workspace',
    actor: 'system',
    source_ref: attestation.stellarTxHash,
  }))
}

export function serializeCsv(
  records: readonly ExportRecord[],
  columns?: readonly string[],
): string {
  const chosen = selectedColumns(columns)
  return toCsv(
    chosen.map((column) => column.label),
    records.map((record) => chosen.map((column) => record[column.id] ?? '')),
  )
}

export function serializeJson(
  records: readonly ExportRecord[],
  request?: Pick<ExportJobRequest, 'scope'>,
  generatedAt?: string,
): string {
  return JSON.stringify(
    {
      generatedAt: generatedAt ?? new Date().toISOString(),
      scope: request?.scope ?? 'all',
      recordCount: records.length,
      records,
    },
    null,
    2,
  )
}

function serializeExport(
  request: ExportJobRequest,
  attestations: readonly Attestation[],
  generatedAt: string,
): { blob: Blob; records: ExportRecord[] } {
  const records = toExportRecords(attestations, request)
  let content: string
  let mimeType: string

  if (request.format === 'csv') {
    content = serializeCsv(records, request.columns)
    mimeType = 'text/csv;charset=utf-8'
  } else if (request.format === 'json') {
    content = serializeJson(records, request, generatedAt)
    mimeType = 'application/json;charset=utf-8'
  } else {
    content = FORMAT_SAMPLE[request.format]
    mimeType = request.format === 'pdf' ? 'application/pdf' : 'application/octet-stream'
  }

  return { blob: new Blob([content], { type: mimeType }), records }
}

export function createExportService(options: ExportServiceOptions = {}): ExportService {
  const tickMs = Math.max(1, options.tickMs ?? 600)
  const progressStep = options.progressStep ?? 20
  const attestations = options.attestations ?? MOCK_ATTESTATIONS
  const now = options.now ?? (() => Date.now())
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS
  const failFirstAttempts = options.failFirstAttempts ?? 0
  const jobs = new Map<string, InternalJob>()
  let sequence = 0

  function clearTimer(entry: InternalJob) {
    if (entry.timer !== undefined) {
      clearInterval(entry.timer)
      entry.timer = undefined
    }
  }

  function advance(id: string) {
    const entry = jobs.get(id)
    if (!entry) return
    if (isTerminalJobStatus(entry.job.status)) {
      clearTimer(entry)
      return
    }

    const nextProgress = Math.min(100, entry.job.progress + progressStep)

    if (entry.shouldFail && entry.attempt === 1 && nextProgress >= 60) {
      clearTimer(entry)
      entry.job = {
        ...entry.job,
        status: 'failed',
        progress: nextProgress,
        error: 'Export generation failed while preparing the file.',
        cancelled: false,
      }
      return
    }

    if (nextProgress >= 100) {
      clearTimer(entry)
      const generatedAt = new Date(now()).toISOString()
      const { blob } = serializeExport(entry.request, attestations, generatedAt)
      entry.file = blob
      entry.job = {
        ...entry.job,
        status: 'ready',
        progress: 100,
        expiresAt: new Date(now() + retentionMs).toISOString(),
        fileSize: legacyFileSize(entry.request.scope),
        byteSize: blob.size,
        error: null,
        cancelled: false,
      }
      return
    }

    entry.job = { ...entry.job, status: 'processing', progress: nextProgress }
  }

  function start(id: string) {
    const entry = jobs.get(id)
    if (!entry) return
    clearTimer(entry)
    entry.timer = setInterval(() => advance(id), tickMs)
  }

  const service: ExportService = {
    createJob(request) {
      const id = newId('export-')
      sequence += 1
      const entry: InternalJob = {
        job: {
          id,
          format: request.format,
          scope: request.scope,
          status: 'processing',
          progress: 0,
          createdAt: new Date(now()).toISOString(),
          expiresAt: null,
          fileSize: null,
          error: null,
          notifyEmail: request.notifyEmail ?? null,
          cancelled: false,
        },
        request: { ...request },
        attempt: 1,
        shouldFail: sequence <= failFirstAttempts,
      }
      jobs.set(id, entry)
      start(id)
      return { ...entry.job }
    },

    getJob(id) {
      return jobs.get(id)?.job ?? null
    },

    cancelJob(id) {
      const entry = jobs.get(id)
      if (!entry || isTerminalJobStatus(entry.job.status)) return entry?.job ?? null
      clearTimer(entry)
      entry.file = undefined
      entry.job = {
        ...entry.job,
        status: 'failed',
        error: 'Export cancelled.',
        cancelled: true,
        expiresAt: null,
        fileSize: null,
      }
      return entry.job
    },

    retryJob(id) {
      const entry = jobs.get(id)
      if (!entry) return null
      clearTimer(entry)
      entry.file = undefined
      entry.attempt += 1
      entry.job = {
        ...entry.job,
        status: 'processing',
        progress: 0,
        createdAt: new Date(now()).toISOString(),
        expiresAt: null,
        fileSize: null,
        error: null,
        cancelled: false,
        notifyEmail: entry.request.notifyEmail ?? null,
      }
      start(id)
      return entry.job
    },

    getFile(id) {
      return jobs.get(id)?.file ?? null
    },

    stop() {
      jobs.forEach((entry) => clearTimer(entry))
    },

    dispose() {
      jobs.forEach((entry) => clearTimer(entry))
    },
  }

  return service
}

export function pollExportJob(
  service: ExportService,
  id: string,
  onSnapshot: (job: ExportJob) => void,
  options: PollOptions = {},
): PollHandle {
  const initialDelayMs = Math.max(1, options.initialDelayMs ?? 100)
  const maxDelayMs = Math.max(initialDelayMs, options.maxDelayMs ?? 1000)
  const backoffFactor = options.backoffFactor ?? 2
  let delay = initialDelayMs
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastJob: ExportJob | null = null

  const tick = () => {
    if (stopped) return
    const job = service.getJob(id)
    if (!job) return

    if (job !== lastJob) {
      lastJob = job
      onSnapshot(job)
    }

    if (isTerminalJobStatus(job.status)) return

    timer = setTimeout(tick, Math.round(delay))
    delay = Math.min(maxDelayMs, delay * backoffFactor)
  }

  timer = setTimeout(tick, Math.round(delay))

  return {
    stop() {
      stopped = true
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
  }
}

const defaultService = createExportService()

export const createJob = (request: ExportJobRequest) => defaultService.createJob(request)
export const getJob = (id: string) => defaultService.getJob(id)
export const cancelJob = (id: string) => defaultService.cancelJob(id)
export const retryJob = (id: string) => defaultService.retryJob(id)
export const getExportFile = (id: string) => defaultService.getFile(id)
