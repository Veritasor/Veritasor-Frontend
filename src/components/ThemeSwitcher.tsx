import { useId } from 'react'
import type { Theme } from '../hooks/useTheme'
import { useTheme } from '../hooks/useTheme'

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: '🖥' },
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark', label: 'Dark', icon: '☾' },
]

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const groupId = useId()
  const labelId = `${groupId}-label`

  return (
    <div className="theme-switcher" role="radiogroup" aria-labelledby={labelId}>
      <span id={labelId} className="sr-only">Theme</span>
      {OPTIONS.map((opt) => {
        const id = `${groupId}-${opt.value}`
        const checked = theme === opt.value
        return (
          <label
            key={opt.value}
            className={`theme-option${checked ? ' theme-option-active' : ''}`}
            data-value={opt.value}
          >
            <input
              type="radio"
              name={groupId}
              id={id}
              value={opt.value}
              checked={checked}
              onChange={() => setTheme(opt.value)}
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
    </div>
  )
}
