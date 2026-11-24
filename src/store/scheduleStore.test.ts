import { describe, expect, it } from 'vitest'
import { generateOccurrences, type ScheduleRule } from './scheduleStore'

function rule(overrides: Partial<ScheduleRule> = {}): ScheduleRule {
  return {
    id: 'test-schedule',
    startDate: '2026-01-31',
    cadence: 'monthly',
    monthlyMode: 'dayOfMonth',
    localTime: '09:00',
    timeZone: 'UTC',
    ...overrides,
  }
}

describe('generateOccurrences', () => {
  it('clamps monthly day-of-month rules to shorter month ends', () => {
    const occurrences = generateOccurrences(rule(), { fromDate: '2026-01-31', count: 4 })
    expect(occurrences.map(({ date }) => date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('runs a February 29 rule on February 28 in non-leap years', () => {
    const occurrences = generateOccurrences(
      rule({ startDate: '2024-02-29' }),
      { fromDate: '2025-02-28', count: 1 },
    )
    expect(occurrences[0].date).toBe('2025-02-28')
  })

  it('keeps the requested wall-clock time across a DST transition', () => {
    const occurrences = generateOccurrences(
      rule({
        startDate: '2026-03-07',
        cadence: 'daily',
        localTime: '09:00',
        timeZone: 'America/New_York',
      }),
      { fromDate: '2026-03-07', count: 3 },
    )
    expect(occurrences.map(({ scheduledAt }) => scheduledAt)).toEqual([
      '2026-03-07T14:00:00.000Z',
      '2026-03-08T13:00:00.000Z',
      '2026-03-09T13:00:00.000Z',
    ])
  })

  it('moves a nonexistent spring-forward wall time forward by the DST gap', () => {
    const occurrences = generateOccurrences(
      rule({
        startDate: '2026-03-08',
        cadence: 'daily',
        localTime: '02:30',
        timeZone: 'America/New_York',
      }),
      { fromDate: '2026-03-08', count: 1 },
    )
    expect(occurrences[0].scheduledAt).toBe('2026-03-08T07:30:00.000Z')
  })

  it('uses the earlier instant for an ambiguous fall-back wall time', () => {
    const occurrences = generateOccurrences(
      rule({
        startDate: '2026-11-01',
        cadence: 'daily',
        localTime: '01:30',
        timeZone: 'America/New_York',
      }),
      { fromDate: '2026-11-01', count: 1 },
    )
    expect(occurrences[0].scheduledAt).toBe('2026-11-01T05:30:00.000Z')
  })

  it('skips an occurrence whose run time has already passed', () => {
    const occurrences = generateOccurrences(
      rule({ cadence: 'daily', localTime: '09:00' }),
      { fromDate: '2026-01-31', after: '2026-01-31T10:00:00.000Z', count: 1 },
    )
    expect(occurrences[0].date).toBe('2026-02-01')
  })
})
