import { describe, expect, it } from 'vitest'
import {
  computeDashboardKpis,
  extractIsoDate,
  filterAttestationsByDateRange,
  formatAvgTime,
  formatVerifiedRate,
  getLatestAttestationDate,
  isValidIsoDate,
  selectDominantStatus,
} from './dashboardSelectors'

describe('dashboardSelectors', () => {
  describe('computeDashboardKpis', () => {
    it('handles empty data', () => {
      expect(computeDashboardKpis([])).toEqual({
        total: 0,
        verified: 0,
        pending: 0,
        failed: 0,
        verifiedRate: null,
        avgTimeMs: null,
        dominantStatus: null,
      })
    })

    it('handles records with only one status', () => {
      const kpis = computeDashboardKpis([
        { status: 'verified', createdAt: '2026-05-01T10:00:00Z', completedAt: '2026-05-01T10:00:10Z' },
        { status: 'verified', createdAt: '2026-05-02T10:00:00Z', completedAt: '2026-05-02T10:00:20Z' },
      ])

      expect(kpis).toEqual({
        total: 2,
        verified: 2,
        pending: 0,
        failed: 0,
        verifiedRate: 100,
        avgTimeMs: 15000,
        dominantStatus: 'verified',
      })
    })

    it('handles ties across statuses', () => {
      const kpis = computeDashboardKpis([
        { status: 'verified', createdAt: '2026-05-01T10:00:00Z' },
        { status: 'pending', createdAt: '2026-05-02T10:00:00Z' },
        { status: 'failed', createdAt: '2026-05-03T10:00:00Z' },
      ])

      expect(kpis.total).toBe(3)
      expect(kpis.verified).toBe(1)
      expect(kpis.pending).toBe(1)
      expect(kpis.failed).toBe(1)
      expect(kpis.verifiedRate).toBe(33.3)
      expect(kpis.avgTimeMs).toBeNull()
      expect(kpis.dominantStatus).toBe('tie')
    })

    it('filters by date range before computing KPIs', () => {
      const records = [
        { status: 'verified', createdAt: '2026-05-01T10:00:00Z', durationMs: 2000 },
        { status: 'pending', createdAt: '2026-05-15T10:00:00Z', durationMs: 4000 },
        { status: 'failed', createdAt: '2026-05-28T10:00:00Z', durationMs: 6000 },
      ]

      const kpis = computeDashboardKpis(records, { from: '2026-05-10', to: '2026-05-20' })
      expect(kpis).toEqual({
        total: 1,
        verified: 0,
        pending: 1,
        failed: 0,
        verifiedRate: 0,
        avgTimeMs: 4000,
        dominantStatus: 'pending',
      })
    })

    it('uses timestamp delta when completedAt is absent and timestamp > createdAt', () => {
      const kpis = computeDashboardKpis([
        {
          status: 'verified',
          createdAt: '2026-05-01T10:00:00Z',
          timestamp: '2026-05-01T10:02:00Z',
        },
      ])
      expect(kpis.avgTimeMs).toBe(120000)
    })
  })

  describe('selectDominantStatus', () => {
    it('returns null when all counts are zero', () => {
      expect(selectDominantStatus({ verified: 0, pending: 0, failed: 0 })).toBeNull()
    })

    it('returns tie when two statuses share the maximum', () => {
      expect(selectDominantStatus({ verified: 2, pending: 2, failed: 1 })).toBe('tie')
    })
  })

  describe('date helpers', () => {
    it('validates ISO dates strictly', () => {
      expect(isValidIsoDate('2026-05-28')).toBe(true)
      expect(isValidIsoDate('2026-02-30')).toBe(false)
      expect(isValidIsoDate('not-a-date')).toBe(false)
      expect(isValidIsoDate(undefined)).toBe(false)
    })

    it('extracts ISO date from date, createdAt, or timestamp', () => {
      expect(extractIsoDate({ date: '2026-05-01' })).toBe('2026-05-01')
      expect(extractIsoDate({ createdAt: '2026-05-15T09:10:00Z' })).toBe('2026-05-15')
      expect(extractIsoDate({ timestamp: '2026-05-20T11:45:00Z' })).toBe('2026-05-20')
      expect(extractIsoDate({})).toBeNull()
    })

    it('finds latest attestation date', () => {
      expect(
        getLatestAttestationDate([
          { createdAt: '2026-05-15T09:10:00Z' },
          { createdAt: '2026-05-28T14:32:00Z' },
          { createdAt: '2026-05-20T11:45:00Z' },
        ]),
      ).toBe('2026-05-28')
      expect(getLatestAttestationDate([])).toBeNull()
    })

    it('ignores invalid bounds in filterAttestationsByDateRange', () => {
      const records = [{ createdAt: '2026-05-15T09:10:00Z' }]
      expect(filterAttestationsByDateRange(records, { from: 'invalid', to: 'also-invalid' })).toHaveLength(1)
    })
  })

  describe('formatters', () => {
    it('formats verified rate', () => {
      expect(formatVerifiedRate(null)).toBe('—')
      expect(formatVerifiedRate(100)).toBe('100%')
      expect(formatVerifiedRate(33.3)).toBe('33.3%')
    })

    it('formats average time across units', () => {
      expect(formatAvgTime(null)).toBe('—')
      expect(formatAvgTime(450)).toBe('450ms')
      expect(formatAvgTime(15000)).toBe('15s')
      expect(formatAvgTime(120000)).toBe('2m')
      expect(formatAvgTime(135000)).toBe('2m 15s')
      expect(formatAvgTime(3600000)).toBe('1h')
      expect(formatAvgTime(5400000)).toBe('1h 30m')
    })
  })
})
