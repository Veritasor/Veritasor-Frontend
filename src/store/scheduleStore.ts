import { useSyncExternalStore } from 'react'

export type ScheduleCadence = 'daily' | 'weekly' | 'monthly'
export type MonthlyMode = 'dayOfMonth' | 'lastDay'

export interface ScheduleRule {
  id: string
  startDate: string
  cadence: ScheduleCadence
  monthlyMode: MonthlyMode
  localTime: string
  timeZone: string
}

export type NewScheduleRule = Omit<ScheduleRule, 'id'>

export interface ScheduleOccurrence {
  date: string
  scheduledAt: string
}

const STORAGE_KEY = 'veritasor-schedules-v1'
export const SCHEDULES_SCHEMA_VERSION = 1
const DEFAULT_OCCURRENCE_COUNT = 10
const datePattern = /^\d{4}-\d{2}-\d{2}$/

interface PersistedSchedules {
  version: number
  schedules: ScheduleRule[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !datePattern.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidRule(value: unknown): value is ScheduleRule {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    isValidDate(value.startDate) &&
    (value.cadence === 'daily' || value.cadence === 'weekly' || value.cadence === 'monthly') &&
    (value.monthlyMode === 'dayOfMonth' || value.monthlyMode === 'lastDay') &&
    typeof value.localTime === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value.localTime) &&
    typeof value.timeZone === 'string' &&
    isValidTimeZone(value.timeZone)
  )
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone })
    return true
  } catch {
    return false
  }
}

function parseStored(raw: string): ScheduleRule[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== SCHEDULES_SCHEMA_VERSION || !Array.isArray(parsed.schedules)) {
      return []
    }
    return parsed.schedules.filter(isValidRule)
  } catch {
    return []
  }
}

function readStorage(): ScheduleRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? [] : parseStored(raw)
  } catch {
    return []
  }
}

function writeStorage(schedules: ScheduleRule[]): void {
  try {
    const payload: PersistedSchedules = { version: SCHEDULES_SCHEMA_VERSION, schedules }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage can be unavailable in private browsing or when its quota is exhausted.
  }
}

let state = readStorage()
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function setState(next: ScheduleRule[]): void {
  state = next
  writeStorage(next)
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return
  state = typeof event.newValue === 'string' ? parseStored(event.newValue) : readStorage()
  notify()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageEvent)
}

function dateParts(date: string): [number, number, number] {
  return date.split('-').map(Number) as [number, number, number]
}

function toDateString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = dateParts(date)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  return toDateString(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate())
}

export function getDateInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function getZonedParts(timeZone: string, instant: number): [number, number, number, number, number] {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]))
  return [values.year, values.month, values.day, values.hour, values.minute]
}

function wallTimeKey(parts: [number, number, number, number, number]): string {
  const [year, month, day, hour, minute] = parts
  return `${toDateString(year, month, day)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function resolveWallTime(date: string, localTime: string, timeZone: string): Date {
  const [year, month, day] = dateParts(date)
  const [hour, minute] = localTime.split(':').map(Number)
  const targetKey = `${date}T${localTime}`
  const wallTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  const offsets = new Set<number>()

  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wallTimeAsUtc + hours * 60 * 60 * 1000
    const localParts = getZonedParts(timeZone, sample)
    const localAsUtc = Date.UTC(
      localParts[0],
      localParts[1] - 1,
      localParts[2],
      localParts[3],
      localParts[4],
    )
    offsets.add(localAsUtc - sample)
  }

  const candidates = [...offsets].map((offset) => wallTimeAsUtc - offset)
  const exact = candidates
    .filter((instant) => wallTimeKey(getZonedParts(timeZone, instant)) === targetKey)
    .sort((a, b) => a - b)
  if (exact.length > 0) return new Date(exact[0])

  // For a clock time skipped by a DST jump, use the first representable wall
  // time after the requested time. For repeated times, the earlier instant wins.
  const afterGap = candidates
    .map((instant) => ({ instant, wallKey: wallTimeKey(getZonedParts(timeZone, instant)) }))
    .filter(({ wallKey }) => wallKey > targetKey)
    .sort((a, b) => a.wallKey.localeCompare(b.wallKey) || a.instant - b.instant)
  if (afterGap.length > 0) return new Date(afterGap[0].instant)

  throw new RangeError(`Unable to resolve ${targetKey} in ${timeZone}`)
}

function getOccurrenceDate(rule: ScheduleRule, date: string): string | null {
  if (date < rule.startDate) return null
  if (rule.cadence === 'daily') return date

  const [startYear, startMonth, startDay] = dateParts(rule.startDate)
  const [year, month, day] = dateParts(date)
  if (rule.cadence === 'weekly') {
    const startWeekday = new Date(Date.UTC(startYear, startMonth - 1, startDay)).getUTCDay()
    const currentWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    return currentWeekday === startWeekday ? date : null
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const scheduledDay = rule.monthlyMode === 'lastDay' ? lastDay : Math.min(startDay, lastDay)
  return day === scheduledDay ? date : null
}

export function generateOccurrences(
  rule: ScheduleRule,
  options: { fromDate: string; count?: number; after?: string },
): ScheduleOccurrence[] {
  if (!isValidRule(rule)) throw new TypeError('Invalid attestation schedule rule')
  const { fromDate } = options
  if (!isValidDate(fromDate)) throw new TypeError('fromDate must be a valid YYYY-MM-DD date')
  const after = options.after === undefined ? undefined : Date.parse(options.after)
  if (after !== undefined && Number.isNaN(after)) throw new TypeError('after must be a valid ISO timestamp')
  const count = options.count ?? DEFAULT_OCCURRENCE_COUNT
  if (!Number.isInteger(count) || count < 0) throw new RangeError('count must be a non-negative integer')
  if (count === 0) return []

  const occurrences: ScheduleOccurrence[] = []
  let date = rule.startDate > fromDate ? rule.startDate : fromDate
  while (occurrences.length < count) {
    if (getOccurrenceDate(rule, date)) {
      const scheduledAt = resolveWallTime(date, rule.localTime, rule.timeZone).toISOString()
      if (after === undefined || Date.parse(scheduledAt) > after) {
        occurrences.push({ date, scheduledAt })
      }
    }
    date = addCalendarDays(date, 1)
  }
  return occurrences
}

export const scheduleStore = {
  getAll(): ScheduleRule[] {
    return state
  },
  add(rule: NewScheduleRule): ScheduleRule {
    if (!isValidRule({ ...rule, id: 'validation' })) throw new TypeError('Invalid attestation schedule rule')
    const saved = { ...rule, id: `schedule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }
    setState([...state, saved])
    return saved
  },
  update(id: string, rule: NewScheduleRule): void {
    if (!isValidRule({ ...rule, id })) throw new TypeError('Invalid attestation schedule rule')
    setState(state.map((current) => (current.id === id ? { ...rule, id } : current)))
  },
  remove(id: string): void {
    setState(state.filter((rule) => rule.id !== id))
  },
  reset(): void {
    setState([])
  },
}

export function useSchedules(): ScheduleRule[] {
  return useSyncExternalStore(subscribe, () => state, () => [])
}
