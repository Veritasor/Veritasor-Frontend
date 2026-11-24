import { useRef, useState, type KeyboardEvent } from 'react'
import { isValidIsoDate, type DateRange } from '../utils/dashboardSelectors'

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom' | 'all'

interface PresetOption {
  id: '7d' | '30d' | '90d' | 'custom'
  label: string
  days?: number
}

const PRESETS: readonly PresetOption[] = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: 'custom', label: 'Custom' },
]

export interface DateRangePickerProps {
  from?: string
  to?: string
  referenceDate?: string
  onChange: (range: DateRange) => void
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function detectActivePreset(
  from: string | undefined,
  to: string | undefined,
  anchorDate: string,
): DateRangePreset {
  if (!isValidIsoDate(from) && !isValidIsoDate(to)) return 'all'
  if (isValidIsoDate(from) && isValidIsoDate(to) && to === anchorDate) {
    for (const preset of PRESETS) {
      if (preset.days && from === shiftIsoDate(anchorDate, -(preset.days - 1))) {
        return preset.id
      }
    }
  }
  return 'custom'
}

export default function DateRangePicker({
  from,
  to,
  referenceDate,
  onChange,
}: DateRangePickerProps) {
  const anchorDate = isValidIsoDate(referenceDate) ? referenceDate : getTodayIso()
  const detectedPreset = detectActivePreset(from, to, anchorDate)
  const [showCustom, setShowCustom] = useState(detectedPreset === 'custom')
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const activePreset: DateRangePreset = showCustom ? 'custom' : detectedPreset

  function handlePresetClick(preset: PresetOption) {
    if (preset.id === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    const nextTo = anchorDate
    const nextFrom = shiftIsoDate(anchorDate, -((preset.days ?? 30) - 1))
    onChange({ from: nextFrom, to: nextTo })
  }

  function handlePresetKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = (index + 1) % PRESETS.length
      buttonRefs.current[next]?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const prev = (index - 1 + PRESETS.length) % PRESETS.length
      buttonRefs.current[prev]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      buttonRefs.current[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      buttonRefs.current[PRESETS.length - 1]?.focus()
    }
  }

  function handleCustomFromChange(nextFrom: string) {
    const validFrom = isValidIsoDate(nextFrom) ? nextFrom : undefined
    const validTo = isValidIsoDate(to) ? to : undefined
    if (validFrom && validTo && validFrom > validTo) {
      onChange({ from: validFrom, to: validFrom })
      return
    }
    onChange({ from: validFrom, to: validTo })
  }

  function handleCustomToChange(nextTo: string) {
    const validFrom = isValidIsoDate(from) ? from : undefined
    const validTo = isValidIsoDate(nextTo) ? nextTo : undefined
    if (validFrom && validTo && validTo < validFrom) {
      onChange({ from: validTo, to: validTo })
      return
    }
    onChange({ from: validFrom, to: validTo })
  }

  function handleClear() {
    setShowCustom(false)
    onChange({})
  }

  const hasRange = isValidIsoDate(from) || isValidIsoDate(to)

  return (
    <div className="date-range-picker" role="group" aria-label="Date range filter">
      <div className="date-range-picker__presets" role="toolbar" aria-label="Date range presets">
        {PRESETS.map((preset, index) => {
          const isActive = activePreset === preset.id
          return (
            <button
              key={preset.id}
              ref={(el) => {
                buttonRefs.current[index] = el
              }}
              type="button"
              className={`date-range-picker__btn${isActive ? ' date-range-picker__btn--active' : ''}`}
              aria-pressed={isActive}
              onClick={() => handlePresetClick(preset)}
              onKeyDown={(e) => handlePresetKeyDown(e, index)}
            >
              {preset.label}
            </button>
          )
        })}
        {hasRange && (
          <button
            type="button"
            className="date-range-picker__btn date-range-picker__btn--clear"
            onClick={handleClear}
          >
            All time
          </button>
        )}
      </div>

      {showCustom && (
        <div className="date-range-picker__custom">
          <label className="date-range-picker__field">
            <span>From</span>
            <input
              type="date"
              aria-label="From date"
              value={isValidIsoDate(from) ? from : ''}
              max={isValidIsoDate(to) ? to : undefined}
              onChange={(e) => handleCustomFromChange(e.target.value)}
            />
          </label>
          <label className="date-range-picker__field">
            <span>To</span>
            <input
              type="date"
              aria-label="To date"
              value={isValidIsoDate(to) ? to : ''}
              min={isValidIsoDate(from) ? from : undefined}
              onChange={(e) => handleCustomToChange(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
