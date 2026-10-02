import { describe, it, expect } from 'vitest'
import {
  buildTrendData, // <- REPLACE with the real exported function(s)
  type AttestationStatus,
  type AttestationInput,
  type AttestationTrendDatum,
} from './attestationChartData'

const make = (over: Partial<AttestationInput> = {}): AttestationInput => ({
  // REPLACE with real required fields
  id: 'a1',
  status: 'verified',
  createdAt: '2026-01-15T00:00:00.000Z',
  ...over,
})

describe('attestationChartData', () => {
  describe('AttestationStatus handling', () => {
    const statuses: AttestationStatus[] = ['verified', 'pending', 'failed'] // REPLACE
    it.each(statuses)('counts a %s attestation', (status) => {
      const result = buildTrendData([make({ status })])
      expect(result.length).toBeGreaterThan(0)
      // assert the bucket for this status is incremented
    })
  })

  describe('AttestationTrendDatum shape', () => {
    it('returns datums with the documented fields', () => {
      const [datum]: AttestationTrendDatum[] = buildTrendData([make()])
      expect(datum).toMatchObject({ /* real field names + expected values */ })
    })
  })

  describe('AttestationInput boundaries', () => {
    it('returns an empty result for an empty list', () => {
      expect(buildTrendData([])).toEqual([])
    })
    it('groups attestations on the same day into one datum', () => {})
    it('orders datums chronologically', () => {})
  })

  describe('invalid input', () => {
    it('handles an invalid date deterministically', () => {
      const run = () => buildTrendData([make({ createdAt: 'not-a-date' })])
      // assert EITHER it throws a specific error OR it skips/falls back.
      // Do whichever the current code does. Don't change behavior.
    })
    it('handles an unknown status', () => {
      const bad = make({ status: 'bogus' as AttestationStatus })
      // assert actual current behavior
    })
    it('handles null/undefined input', () => {})
  })

  describe('state transitions', () => {
    it('moves a count from pending to verified when status changes', () => {
      const before = buildTrendData([make({ status: 'pending' })])
      const after = buildTrendData([make({ status: 'verified' })])
      expect(after).not.toEqual(before)
    })
    it('moves a count from pending to failed when status changes', () => {})
  })
})