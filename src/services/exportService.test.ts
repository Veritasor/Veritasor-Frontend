import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  createExportService,
  pollExportJob,
  serializeCsv,
  serializeJson,
  type ExportRecord,
  type ExportService,
} from './exportService'
import type { ExportJob } from '../components/data-export/exportTypes'

const record: ExportRecord = {
  id: 'att-1',
  created_at: '2026-05-28T14:32:00Z',
  provider: '=HYPERLINK("http://evil.example")',
  gross_amount: '1,000',
  net_amount: '+200',
  currency: 'USD',
  fee: '-5',
  attestation_id: 'att-1',
  merkle_root: '@cmd',
  published_at: '2026-05-28T14:32:00Z',
  status: 'verified',
  workspace_id: 'ws,1',
  actor: 'a"b',
  source_ref: 'line1\nline2',
}

describe('exportService serializers', () => {
  it('quotes RFC 4180 special characters and neutralises formula prefixes', () => {
    const csv = serializeCsv([record])
    const lines = csv.split('\r\n')

    expect(lines[0]).toContain('Record ID,Created at,Provider')
    expect(lines[1]).toContain('"\'=HYPERLINK(""http://evil.example"")"')
    expect(lines[1]).toContain('"1,000"')
    expect(lines[1]).toContain(`'+200`)
    expect(lines[1]).toContain(`'-5`)
    expect(lines[1]).toContain(`'@cmd`)
    expect(lines[1]).toContain('"a""b"')
    expect(lines[1]).toContain('"line1\nline2"')
  })

  it('honours a column subset and emits a header-only CSV for no records', () => {
    expect(serializeCsv([], ['id', 'provider'])).toBe('Record ID,Provider')
    expect(serializeCsv([record], ['id', 'provider']).split('\r\n')[0]).toBe('Record ID,Provider')
  })

  it('serializes JSON with record metadata and leaves values untouched', () => {
    const parsed = JSON.parse(serializeJson([record], { scope: 'all' }, '2026-11-24T00:00:00Z'))

    expect(parsed.generatedAt).toBe('2026-11-24T00:00:00Z')
    expect(parsed.scope).toBe('all')
    expect(parsed.recordCount).toBe(1)
    expect(parsed.records[0].provider).toBe(record.provider)
  })
})

describe('exportService job lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('advances to ready and exposes a real CSV blob', () => {
    const service = createExportService({ tickMs: 100 })
    const job = service.createJob({ format: 'csv', scope: 'last-30-days' })
    const snapshots: ExportJob[] = []

    expect(job.status).toBe('processing')
    expect(job.progress).toBe(0)

    const poll = pollExportJob(service, job.id, (snapshot) => snapshots.push(snapshot), {
      initialDelayMs: 25,
      maxDelayMs: 100,
    })

    vi.advanceTimersByTime(500)

    const latest = snapshots[snapshots.length - 1]
    expect(latest.status).toBe('ready')
    expect(latest.progress).toBe(100)
    expect(latest.expiresAt).not.toBeNull()
    expect(latest.byteSize).toBeGreaterThan(0)

    const blob = service.getFile(job.id)
    expect(blob).not.toBeNull()
    expect(blob?.type).toBe('text/csv;charset=utf-8')
    poll.stop()
    service.stop()
  })

  it('stops polling on a terminal state', () => {
    const service = createExportService({ tickMs: 100 })
    const job = service.createJob({ format: 'json', scope: 'current-filter' })
    const onSnapshot = vi.fn()

    const poll = pollExportJob(service, job.id, onSnapshot, {
      initialDelayMs: 25,
      maxDelayMs: 100,
    })

    vi.advanceTimersByTime(500)
    expect(onSnapshot.mock.calls.length).toBeGreaterThan(0)
    const callsWhenReady = onSnapshot.mock.calls.length

    vi.advanceTimersByTime(1000)
    expect(onSnapshot).toHaveBeenCalledTimes(callsWhenReady)
    expect(service.getJob(job.id)?.status).toBe('ready')
    expect(service.getFile(job.id)?.type).toBe('application/json;charset=utf-8')
    poll.stop()
    service.stop()
  })

  it('uses exponential delays capped at the configured maximum', () => {
    let progress = 0
    const getJob = vi.fn(() => ({
      id: 'job-1',
      status: 'processing',
      progress: progress++,
    }) as ExportJob)
    const service = { getJob } as unknown as ExportService
    const onSnapshot = vi.fn()

    const poll = pollExportJob(service, 'job-1', onSnapshot, {
      initialDelayMs: 10,
      maxDelayMs: 80,
      backoffFactor: 2,
    })

    vi.advanceTimersByTime(10)
    expect(getJob).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(20)
    expect(getJob).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(40)
    expect(getJob).toHaveBeenCalledTimes(3)
    vi.advanceTimersByTime(80)
    expect(getJob).toHaveBeenCalledTimes(4)
    expect(onSnapshot).toHaveBeenCalledTimes(4)

    poll.stop()
    vi.advanceTimersByTime(1000)
    expect(getJob).toHaveBeenCalledTimes(4)
  })

  it('cancels an in-flight job and stops its poller', () => {
    const service = createExportService({ tickMs: 100 })
    const job = service.createJob({ format: 'csv', scope: 'all' })
    const onSnapshot = vi.fn()
    const poll = pollExportJob(service, job.id, onSnapshot, {
      initialDelayMs: 10,
      maxDelayMs: 20,
    })

    vi.advanceTimersByTime(10)
    expect(onSnapshot).toHaveBeenCalled()

    const cancelled = service.cancelJob(job.id)
    poll.stop()
    const callsAfterCancel = onSnapshot.mock.calls.length

    expect(cancelled?.status).toBe('failed')
    expect(cancelled?.cancelled).toBe(true)
    expect(cancelled?.error).toBe('Export cancelled.')
    expect(service.getJob(job.id)?.status).toBe('failed')

    vi.advanceTimersByTime(1000)
    expect(onSnapshot).toHaveBeenCalledTimes(callsAfterCancel)
    service.stop()
  })

  it('retries a failed job and generates the file on the second attempt', () => {
    const service = createExportService({ tickMs: 100, failFirstAttempts: 1 })
    const job = service.createJob({ format: 'json', scope: 'all' })

    vi.advanceTimersByTime(300)
    expect(service.getJob(job.id)?.status).toBe('failed')
    expect(service.getJob(job.id)?.error).toMatch(/failed/i)

    const retried = service.retryJob(job.id)
    expect(retried?.status).toBe('processing')
    expect(retried?.progress).toBe(0)
    expect(retried?.error).toBeNull()

    vi.advanceTimersByTime(500)
    expect(service.getJob(job.id)?.status).toBe('ready')
    expect(service.getFile(job.id)).not.toBeNull()
    service.stop()
  })
})
