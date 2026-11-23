import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { NewScheduleRule, ScheduleRule } from '../../store/scheduleStore'

export type Cadence = 'daily' | 'weekly' | 'monthly'

export type MonthGridDay = {
  date: Date
  isoDate: string // YYYY-MM-DD in local time
  inMonth: boolean
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalIsoDate(d: Date) {
  // YYYY-MM-DD using local time
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function fromLocalIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDaysLocal(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfMonthLocal(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonthLocal(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

function weekdayShortLabels() {
  const base = new Date(2021, 7, 1) // arbitrary Sunday-ish week anchor
  // We'll format based on browser locale; assumes we start week on Monday for a11y clarity.
  // If you need locale-specific week starts, wire to Intl/CLDR. For now fixed Monday.
  const monday = new Date(base)
  // Make monday: base might not be monday.
  const day = (monday.getDay() + 6) % 7 // 0..6 where 0 => Monday
  monday.setDate(monday.getDate() - day)

  const labels: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDaysLocal(monday, i)
    labels.push(
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
      }).format(d)
    )
  }
  return labels
}

function normalizeSelectedForCadence(args: {
  cadence: Cadence
  selectedDate: Date
}) {
  // Placeholder: currently selection is the chosen day; recurrence summary handles rule.
  // We keep this to make it obvious where to apply recurrence-specific normalization.
  return args.selectedDate
}

function describeRecurrence(args: {
  cadence: Cadence
  startDate: Date
  selectedDate: Date
  monthlyMode: 'dayOfMonth' | 'lastDay'
  timeZone: string
}) {
  const tz = args.timeZone
  const startLocal = args.startDate
  const selLocal = args.selectedDate

  const startStr = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(startLocal)

  if (args.cadence === 'daily') {
    return `Occurs daily starting ${startStr}. (${tz})`
  }

  if (args.cadence === 'weekly') {
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(selLocal)
    return `Occurs every week on ${weekday} starting ${startStr}. (${tz})`
  }

  // monthly
  if (args.monthlyMode === 'lastDay') {
    return `Occurs every month on the last day of the month starting ${startStr}. (${tz})`
  }

  const dom = selLocal.getDate()
  // Leap-day behavior: Feb 29 rolls to Feb 28 in non-leap years.
  const isFeb29 = selLocal.getMonth() === 1 && selLocal.getDate() === 29
  if (isFeb29) {
    return `Occurs every month on day 29 starting ${startStr}. In non-leap years, it runs on February 28. (${tz})`
  }

  return `Occurs every month on day ${dom} of the month starting ${startStr}. (${tz})`
}

export type AttestationCalendarProps = {
  scheduledDates?: (string | Date)[]
  initialMonth?: Date
  initialSelectedDate?: Date
  initialRule?: ScheduleRule
  onSave?: (rule: NewScheduleRule) => void
  onCancelEdit?: () => void
}

export function AttestationCalendar({
  scheduledDates = [],
  initialMonth,
  initialSelectedDate,
  initialRule,
  onSave,
  onCancelEdit,
}: AttestationCalendarProps) {
  const today = useMemo(() => new Date(), [])

  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const base = initialMonth ?? (initialRule ? fromLocalIsoDate(initialRule.startDate) : today)
    return startOfMonthLocal(base)
  })

  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(() => {
    const base = initialRule
      ? fromLocalIsoDate(initialRule.startDate)
      : initialSelectedDate ?? today
    return toLocalIsoDate(base)
  })

  // Recurrence Builder state
  const [cadence, setCadence] = useState<Cadence>(initialRule?.cadence ?? 'monthly')
  const [monthlyMode, setMonthlyMode] = useState<'dayOfMonth' | 'lastDay'>(initialRule?.monthlyMode ?? 'dayOfMonth')
  const [localTime, setLocalTime] = useState(initialRule?.localTime ?? '09:00')
  const [timeZone, setTimeZone] = useState(
    initialRule?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  )

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedIsoDate.split('-').map((x) => Number(x))
    return new Date(y, m - 1, d)
  }, [selectedIsoDate])

  const startDate = useMemo(() => {
    // For UI simplicity we treat the startDate as the selectedDate.
    return selectedDate
  }, [selectedDate])

  const scheduledIsoSet = useMemo(() => {
    const s = new Set<string>()
    for (const item of scheduledDates) {
      if (typeof item === 'string') {
        // accept YYYY-MM-DD or ISO-8601
        if (/^\d{4}-\d{2}-\d{2}$/.test(item)) {
          s.add(item)
        } else {
          const dt = new Date(item)
          s.add(toLocalIsoDate(dt))
        }
      } else {
        s.add(toLocalIsoDate(item))
      }
    }
    return s
  }, [scheduledDates])

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonthLocal(monthCursor)
    const monthEnd = endOfMonthLocal(monthCursor)

    // Monday-start grid.
    const firstDow = (monthStart.getDay() + 6) % 7 // Monday=0
    const gridStart = addDaysLocal(monthStart, -firstDow)

    const lastDow = (monthEnd.getDay() + 6) % 7
    const gridEnd = addDaysLocal(monthEnd, 6 - lastDow)

    const days: MonthGridDay[] = []
    let cursor = new Date(gridStart)
    while (cursor <= gridEnd) {
      days.push({
        date: new Date(cursor),
        isoDate: toLocalIsoDate(cursor),
        inMonth: cursor.getMonth() === monthCursor.getMonth(),
      })
      cursor = addDaysLocal(cursor, 1)
    }

    return days
  }, [monthCursor])

  const gridRef = useRef<HTMLDivElement | null>(null)
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const liveRegionRef = useRef<HTMLDivElement | null>(null)
  const [liveMessage, setLiveMessage] = useState('')

  const announce = (message: string) => {
    setLiveMessage(message)
  }

  useEffect(() => {
    // When month changes, if selected isn't in grid, we'll still keep it selected; focus will snap on next navigation.
    announce(`Selected ${formatSelectedHuman(selectedDate)}.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatSelectedHuman = (d: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  }

  const activeCellIso = selectedIsoDate

  useEffect(() => {
    const el = cellRefs.current.get(activeCellIso)
    if (el) el.focus()
  }, [activeCellIso])

  const moveSelection = (deltaDays: number) => {
    const current = selectedDate
    const next = addDaysLocal(current, deltaDays)
    const nextIso = toLocalIsoDate(next)
    setSelectedIsoDate(nextIso)

    if (next.getMonth() !== monthCursor.getMonth() || next.getFullYear() !== monthCursor.getFullYear()) {
      setMonthCursor(startOfMonthLocal(next))
    }
  }

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key

    // Prevent arrow keys from scrolling.
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)) {
      e.preventDefault()
    }

    if (key === 'Enter' || key === ' ') {
      e.preventDefault()
      const human = formatSelectedHuman(selectedDate)
      announce(`Scheduled date selected: ${human}.`)
      return
    }

    if (key === 'ArrowLeft') {
      moveSelection(-1)
      announce(`Highlighted ${formatSelectedHuman(addDaysLocal(selectedDate, -1))}.`)
      return
    }
    if (key === 'ArrowRight') {
      moveSelection(1)
      announce(`Highlighted ${formatSelectedHuman(addDaysLocal(selectedDate, 1))}.`)
      return
    }
    if (key === 'ArrowUp') {
      moveSelection(-7)
      announce(`Highlighted ${formatSelectedHuman(addDaysLocal(selectedDate, -7))}.`)
      return
    }
    if (key === 'ArrowDown') {
      moveSelection(7)
      announce(`Highlighted ${formatSelectedHuman(addDaysLocal(selectedDate, 7))}.`)
      return
    }

    if (key === 'Home') {
      // Go to first day of current grid week row.
      const dow = (selectedDate.getDay() + 6) % 7
      moveSelection(-dow)
      announce(`Highlighted ${formatSelectedHuman(addDaysLocal(selectedDate, -dow))}.`)
      return
    }

    if (key === 'End') {
      const dow = (selectedDate.getDay() + 6) % 7
      moveSelection(6 - dow)
      announce(`Highlighted ${formatSelectedHuman(addDaysLocal(selectedDate, 6 - dow))}.`)
      return
    }

    if (key === 'PageUp') {
      const next = new Date(selectedDate)
      next.setMonth(next.getMonth() - 1)
      // Clamp: if selection day doesn't exist in target month, JS rolls over; we want clamp.
      const target = new Date(next.getFullYear(), next.getMonth(), 1)
      const maxDay = endOfMonthLocal(target).getDate()
      const day = Math.min(selectedDate.getDate(), maxDay)
      const clamped = new Date(target.getFullYear(), target.getMonth(), day)
      setSelectedIsoDate(toLocalIsoDate(clamped))
      setMonthCursor(startOfMonthLocal(clamped))
      announce(`Highlighted ${formatSelectedHuman(clamped)}.`)
      return
    }

    if (key === 'PageDown') {
      const next = new Date(selectedDate)
      next.setMonth(next.getMonth() + 1)
      const target = new Date(next.getFullYear(), next.getMonth(), 1)
      const maxDay = endOfMonthLocal(target).getDate()
      const day = Math.min(selectedDate.getDate(), maxDay)
      const clamped = new Date(target.getFullYear(), target.getMonth(), day)
      setSelectedIsoDate(toLocalIsoDate(clamped))
      setMonthCursor(startOfMonthLocal(clamped))
      announce(`Highlighted ${formatSelectedHuman(clamped)}.`)
      return
    }
  }

  function handleSave() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) {
      announce('Enter a valid run time.')
      return
    }
    try {
      new Intl.DateTimeFormat(undefined, { timeZone })
    } catch {
      announce('Enter a valid IANA time zone, such as America/New_York.')
      return
    }
    onSave?.({
      startDate: selectedIsoDate,
      cadence,
      monthlyMode,
      localTime,
      timeZone,
    })
    announce(initialRule ? 'Attestation schedule updated.' : 'Attestation schedule saved.')
  }

  const cadenceSummary = useMemo(() => {
    const normalized = normalizeSelectedForCadence({ cadence, selectedDate })
    return describeRecurrence({
      cadence,
      startDate,
      selectedDate: normalized,
      monthlyMode,
      timeZone,
    })
  }, [cadence, monthlyMode, selectedDate, startDate, timeZone])

  const labels = useMemo(() => weekdayShortLabels(), [])

  return (
    <section
      aria-label="Schedule periodic attestation runs"
      style={{
        marginTop: '1.25rem',
        padding: 'var(--density-padding)',
        background: 'var(--surface)',
        borderRadius: 14,
        border: '1px solid var(--border)',
        display: 'grid',
        gap: 'var(--density-row-gap)',
      }}
    >
      <header style={{ display: 'grid', gap: '0.35rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Schedule</h2>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
          Use arrow keys to move across days. Press Enter or Space to select a date.
        </p>
      </header>

      <div
        className="sched-layout"
        style={{
          display: 'grid',
          gap: 'var(--density-row-gap)',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
          alignItems: 'start',
        }}
      >
        {/* Calendar Grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              <strong style={{ fontSize: '1rem' }}>{formatMonthYear(monthCursor)}</strong>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                Time zone: {timeZone}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(monthCursor)
                  d.setMonth(d.getMonth() - 1)
                  setMonthCursor(startOfMonthLocal(d))
                }}
                aria-label="Previous month"
                style={{
                  border: '1px solid var(--border)',
                  background: 'rgba(148, 163, 184, 0.08)',
                  color: 'var(--text)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem 0.65rem',
                  cursor: 'pointer',
                  minHeight: 36,
                  fontWeight: 700,
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(monthCursor)
                  d.setMonth(d.getMonth() + 1)
                  setMonthCursor(startOfMonthLocal(d))
                }}
                aria-label="Next month"
                style={{
                  border: '1px solid var(--border)',
                  background: 'rgba(148, 163, 184, 0.08)',
                  color: 'var(--text)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem 0.65rem',
                  cursor: 'pointer',
                  minHeight: 36,
                  fontWeight: 700,
                }}
              >
                →
              </button>
            </div>
          </div>

          <div
            ref={gridRef}
            aria-label="Attestation schedule calendar"
            aria-describedby="attestation-calendar-instructions"
            tabIndex={0}
            onKeyDown={onGridKeyDown}
            style={{
              marginTop: '0.75rem',
              display: 'grid',
              gap: '0.4rem',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              userSelect: 'none',
            }}
          >
            <div id="attestation-calendar-instructions" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
              Arrow keys move focus between days. Enter or Space selects the highlighted date.
            </div>

            {labels.map((label, idx) => (
              <div key={label + idx} aria-hidden="true" style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 800, fontSize: '0.8rem' }}>
                {label}
              </div>
            ))}

            {monthGridDays.map((day) => {
              const isScheduled = scheduledIsoSet.has(day.isoDate)
              const isSelected = day.isoDate === selectedIsoDate

              return (
                <button
                  key={day.isoDate}
                  ref={(el) => {
                    if (!el) return
                    cellRefs.current.set(day.isoDate, el)
                  }}
                  type="button"
                  aria-selected={isSelected ? 'true' : 'false'}
                  aria-label={`${formatSelectedHuman(day.date)}${isScheduled ? ', scheduled' : ''}${day.inMonth ? '' : ', not in current month'}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => {
                    setSelectedIsoDate(day.isoDate)
                    setMonthCursor(startOfMonthLocal(day.date))
                    announce(`Scheduled date selected: ${formatSelectedHuman(day.date)}.`)
                  }}
                  style={{
                    minHeight: 44,
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${isSelected ? 'rgba(96, 165,250, 0.9)' : 'rgba(148, 163, 184, 0.22)'}`,
                    background: isSelected
                      ? 'rgba(96, 165,250, 0.18)'
                      : day.inMonth
                        ? 'rgba(148, 163, 184, 0.06)'
                        : 'transparent',
                    color: day.inMonth ? 'var(--text)' : 'var(--muted)',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative',
                    outline: 'none',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{day.date.getDate()}</span>
                  {/* subtle scheduled indicator */}
                  {isScheduled ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        width: 18,
                        height: 6,
                        borderRadius: 999,
                        background: 'rgba(34, 211, 238, 0.18)',
                        border: '1px solid rgba(34, 211, 238, 0.55)',
                        boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.10)',
                      }}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: 'rgba(34, 211, 238, 0.6)', boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.15)' }} />
              Scheduled run
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 6, background: 'rgba(96, 165, 250, 0.20)', border: '1px solid rgba(96, 165, 250, 0.85)' }} />
              Selected date
            </span>
          </div>

          <div aria-live="polite" aria-atomic="true" ref={liveRegionRef} style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
            {liveMessage}
          </div>
        </div>

        {/* Recurrence Builder */}
        <aside
          aria-label="Recurrence builder"
          style={{
            borderInlineStart: '1px solid var(--border)',
            paddingInlineStart: 'var(--density-row-gap)',
          }}
        >
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <strong style={{ fontSize: '1rem' }}>Recurrence</strong>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Rule begins on the selected calendar date.
              </div>

              <label style={{ display: 'grid', gap: '0.35rem', fontWeight: 700 }}>
                Run at
                <input
                  type="time"
                  value={localTime}
                  onChange={(event) => setLocalTime(event.target.value)}
                  aria-label="Run time"
                  style={{
                    minHeight: 44,
                    padding: '0.5rem 0.65rem',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', fontWeight: 700 }}>
                Time zone
                <input
                  value={timeZone}
                  onChange={(event) => setTimeZone(event.target.value)}
                  aria-label="Time zone"
                  required
                  style={{
                    minHeight: 44,
                    padding: '0.5rem 0.65rem',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              </label>
            </div>

            <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              <legend style={{ fontWeight: 800, fontSize: '0.95rem' }}>Cadence</legend>

              <div role="radiogroup" aria-label="Select cadence" style={{ display: 'grid', gap: '0.5rem' }}>
                {(
                  [
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.65rem',
                      borderRadius: 12,
                      border: `1px solid ${cadence === opt.id ? 'rgba(96, 165, 250, 0.65)' : 'rgba(148, 163, 184, 0.22)'}`,
                      background: cadence === opt.id ? 'rgba(96, 165, 250, 0.12)' : 'rgba(148, 163, 184, 0.06)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      minHeight: 44,
                    }}
                  >
                    <input
                      type="radio"
                      name="attestation-cadence"
                      value={opt.id}
                      checked={cadence === opt.id}
                      onChange={() => setCadence(opt.id)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontWeight: 900 }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {cadence === 'monthly' ? (
              <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                <legend style={{ fontWeight: 800, fontSize: '0.95rem' }}>Monthly mode</legend>
                <div role="radiogroup" aria-label="Select monthly rule" style={{ display: 'grid', gap: '0.5rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.65rem',
                      borderRadius: 12,
                      border: `1px solid ${monthlyMode === 'lastDay' ? 'rgba(96, 165, 250, 0.65)' : 'rgba(148, 163, 184, 0.22)'}`,
                      background: monthlyMode === 'lastDay' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(148, 163, 184, 0.06)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      minHeight: 44,
                    }}
                  >
                    <input
                      type="radio"
                      name="attestation-monthly-mode"
                      value="lastDay"
                      checked={monthlyMode === 'lastDay'}
                      onChange={() => setMonthlyMode('lastDay')}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontWeight: 900 }}>Last day</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.65rem',
                      borderRadius: 12,
                      border: `1px solid ${monthlyMode === 'dayOfMonth' ? 'rgba(96, 165, 250, 0.65)' : 'rgba(148, 163, 184, 0.22)'}`,
                      background: monthlyMode === 'dayOfMonth' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(148, 163, 184, 0.06)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      minHeight: 44,
                    }}
                  >
                    <input
                      type="radio"
                      name="attestation-monthly-mode"
                      value="dayOfMonth"
                      checked={monthlyMode === 'dayOfMonth'}
                      onChange={() => setMonthlyMode('dayOfMonth')}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontWeight: 900 }}>Day of month</span>
                  </label>
                </div>
              </fieldset>
            ) : null}

            <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.5rem' }}>
              <strong style={{ fontSize: '0.95rem' }}>Plain-English Summary</strong>
              <div
                role="note"
                style={{
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  background: 'rgba(148, 163, 184, 0.06)',
                  borderRadius: 12,
                  padding: '0.75rem 0.85rem',
                  color: 'var(--text)',
                  lineHeight: 1.55,
                  minHeight: 72,
                  fontWeight: 650,
                }}
              >
                {cadenceSummary}
              </div>

              {onSave ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    style={{
                      minHeight: 44,
                      padding: '0.55rem 0.9rem',
                      borderRadius: 10,
                      border: '1px solid var(--accent)',
                      background: 'var(--accent)',
                      color: '#04111f',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {initialRule ? 'Update schedule' : 'Save schedule'}
                  </button>
                  {initialRule && onCancelEdit ? (
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      style={{
                        minHeight: 44,
                        padding: '0.55rem 0.9rem',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel editing
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div
                style={{
                  color: 'var(--muted)',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                }}
              >
                Selected start date: <strong style={{ color: 'var(--text)' }}>{formatSelectedHuman(selectedDate)}</strong>
              </div>
            </div>

            <div>
              <div
                style={{
                  borderRadius: 12,
                  border: '1px dashed rgba(148, 163, 184, 0.35)',
                  padding: '0.85rem 0.85rem',
                  color: 'var(--muted)',
                  fontSize: '0.85rem',
                  lineHeight: 1.65,
                  background: 'rgba(148, 163, 184, 0.06)',
                }}
              >
                <strong style={{ color: 'var(--text)' }}>Edge cases & assumptions</strong>
                <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem' }}>
                  <li>
                    <strong>DST shifts:</strong> date calculations are anchored to the selected <em>calendar date</em> in your local time zone.
                    When clocks shift, the chosen date still maps to the same day, preventing “off-by-one-day” UX.
                  </li>
                  <li>
                    <strong>Leap days:</strong> if the recurrence targets Feb 29, non-leap years roll the run back to Feb 28 (never skipped).
                  </li>
                  <li>
                    <strong>Mobile:</strong> below 820px, the recurrence builder stacks beneath the calendar.
                  </li>
                  <li>
                    <strong>RTL:</strong> the builder divider follows the page direction; the calendar remains Monday-first regardless of locale.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

