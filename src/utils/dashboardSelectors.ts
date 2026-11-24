import type { AttestationStatus } from './attestationChartData'

export interface DashboardAttestationRecord {
  id?: string
  status?: string
  date?: string
  createdAt?: string
  timestamp?: string
  completedAt?: string
  durationMs?: number
}

export interface DateRange {
  from?: string
  to?: string
}

export interface DashboardKpis {
  total: number
  verified: number
  pending: number
  failed: number
  verifiedRate: number | null
  avgTimeMs: number | null
  dominantStatus: AttestationStatus | 'tie' | null
}

export function normalizeAttestationStatus(status?: string): AttestationStatus {
  const normalized = status?.toLowerCase() ?? ''
  if (
    normalized.includes('verif') ||
    normalized.includes('success') ||
    normalized.includes('valid')
  ) {
    return 'verified'
  }
  if (
    normalized.includes('pend') ||
    normalized.includes('review') ||
    normalized.includes('process') ||
    normalized.includes('wait')
  ) {
    return 'pending'
  }
  return 'failed'
}

export function extractIsoDate(record: Pick<DashboardAttestationRecord, 'date' | 'createdAt' | 'timestamp'>): string | null {
  const raw = record.date ?? record.createdAt ?? record.timestamp ?? ''
  if (!raw) return null
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function isValidIsoDate(value?: string | null): value is string {
  if (!value) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function filterAttestationsByDateRange<T extends DashboardAttestationRecord>(
  records: readonly T[],
  range?: DateRange,
): T[] {
  const from = isValidIsoDate(range?.from) ? range.from : undefined
  const to = isValidIsoDate(range?.to) ? range.to : undefined

  if (!from && !to) return [...records]

  return records.filter((record) => {
    const isoDate = extractIsoDate(record)
    if (!isoDate) return false
    if (from && isoDate < from) return false
    if (to && isoDate > to) return false
    return true
  })
}

function getRecordDurationMs(record: DashboardAttestationRecord): number | null {
  if (typeof record.durationMs === 'number' && Number.isFinite(record.durationMs) && record.durationMs >= 0) {
    return record.durationMs
  }

  const startRaw = record.createdAt ?? record.date
  const endRaw = record.completedAt ?? record.timestamp
  if (!startRaw || !endRaw) return null

  const startMs = new Date(startRaw).getTime()
  const endMs = new Date(endRaw).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return null
  }

  if (endMs === startMs && !record.completedAt) {
    return null
  }

  return endMs - startMs
}

export function selectDominantStatus(counts: Record<AttestationStatus, number>): AttestationStatus | 'tie' | null {
  const entries: Array<[AttestationStatus, number]> = [
    ['verified', counts.verified],
    ['pending', counts.pending],
    ['failed', counts.failed],
  ]
  const maxCount = Math.max(...entries.map(([, count]) => count))
  if (maxCount === 0) return null

  const winners = entries.filter(([, count]) => count === maxCount)
  if (winners.length > 1) return 'tie'
  return winners[0][0]
}

export function computeDashboardKpis(
  records: readonly DashboardAttestationRecord[],
  range?: DateRange,
): DashboardKpis {
  const filtered = filterAttestationsByDateRange(records, range)
  const counts: Record<AttestationStatus, number> = {
    verified: 0,
    pending: 0,
    failed: 0,
  }

  let durationSum = 0
  let durationCount = 0

  for (const record of filtered) {
    const status = normalizeAttestationStatus(record.status)
    counts[status] += 1

    const duration = getRecordDurationMs(record)
    if (duration !== null) {
      durationSum += duration
      durationCount += 1
    }
  }

  const total = filtered.length
  const verifiedRate = total === 0 ? null : Math.round((counts.verified / total) * 1000) / 10
  const avgTimeMs = durationCount === 0 ? null : Math.round(durationSum / durationCount)

  return {
    total,
    verified: counts.verified,
    pending: counts.pending,
    failed: counts.failed,
    verifiedRate,
    avgTimeMs,
    dominantStatus: selectDominantStatus(counts),
  }
}

export function getLatestAttestationDate(records: readonly DashboardAttestationRecord[]): string | null {
  let latest: string | null = null
  for (const record of records) {
    const isoDate = extractIsoDate(record)
    if (isoDate && (!latest || isoDate > latest)) {
      latest = isoDate
    }
  }
  return latest
}

export function formatVerifiedRate(rate: number | null): string {
  if (rate === null) return '—'
  return Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`
}

export function formatAvgTime(avgTimeMs: number | null): string {
  if (avgTimeMs === null) return '—'
  if (avgTimeMs < 1000) return `${avgTimeMs}ms`
  const totalSeconds = Math.round(avgTimeMs / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`
}
