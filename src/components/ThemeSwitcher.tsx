import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Theme } from '../hooks/useTheme'
import { useTheme } from '../hooks/useTheme'

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: '🖥' },
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark', label: 'Dark', icon: '☾' },
  { value: 'high-contrast', label: 'High Contrast', icon: '◑' },
]

interface ThemeSwitcherProps {
  userId?: string
}

export default function ThemeSwitcher({ userId }: ThemeSwitcherProps = {}) {
  const { theme, setTheme } = useTheme(userId)
  const [announcement, setAnnouncement] = useState('')
  const radioRefs = useRef<(HTMLInputElement | null)[]>([])
  const groupId = useId()
  const labelId = `${groupId}-label`

  const selectTheme = (opt: { value: Theme; label: string }) => {
    setTheme(opt.value)
    setAnnouncement(`Theme changed to ${opt.label}`)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    let nextIndex: number | null = null

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % OPTIONS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + OPTIONS.length) % OPTIONS.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = OPTIONS.length - 1
    }

    if (nextIndex !== null) {
      e.preventDefault()
      selectTheme(OPTIONS[nextIndex])
      radioRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div className="theme-switcher" role="radiogroup" aria-labelledby={labelId}>
      <span id={labelId} className="sr-only">Theme</span>
      {OPTIONS.map((opt, index) => {
        const id = `${groupId}-${opt.value}`
        const checked = theme === opt.value
        return (
          <label
            key={opt.value}
            className={`theme-option${checked ? ' theme-option-active' : ''}`}
            data-value={opt.value}
            htmlFor={id}
          >
            <input
              ref={(el) => {
                radioRefs.current[index] = el
              }}
              type="radio"
              name={groupId}
              id={id}
              value={opt.value}
              checked={checked}
              tabIndex={checked ? 0 : -1}
              onChange={() => selectTheme(opt)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="sr-only"
            />
            <span className="theme-option-icon" aria-hidden="true">{opt.icon}</span>
            <span className="theme-option-label">{opt.label}</span>
            <span className="theme-preview" aria-hidden="true">
              <span className="theme-preview-swatch theme-preview-bg" />
              <span className="theme-preview-swatch theme-preview-surface" />
              <span className="theme-preview-swatch theme-preview-accent" />
            </span>
          </label>
        )
      })}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}
