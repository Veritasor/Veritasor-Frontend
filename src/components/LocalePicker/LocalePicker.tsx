import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useLocale } from '../../i18n/useLocale'
import { SUPPORTED_LOCALES } from '../../i18n/config'

interface LocalePickerProps {
  compact?: boolean
  className?: string
  onClose?: () => void
}

function LocalePicker({ compact = false, className = '', onClose }: LocalePickerProps) {
  const { locale, setLocale, dir } = useLocale()
  const intl = useIntl()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const liveRegionId = useId()
  const [announcement, setAnnouncement] = useState('')
  const supportedLocale = SUPPORTED_LOCALES.find((item) => item.code === locale)
  const lang = supportedLocale?.code ?? 'en'

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  const filteredLocales = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    if (!query) return [...SUPPORTED_LOCALES]
    return SUPPORTED_LOCALES.filter((option) => {
      return `${option.nativeLabel} ${option.label}`.toLowerCase().includes(query)
    })
  }, [debouncedSearch])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (filteredLocales.length > 0 && focusedIndex >= filteredLocales.length) {
        setFocusedIndex(0)
      }
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [filteredLocales.length, focusedIndex])

  useEffect(() => {
    if (!open) return
    const options = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
    options[focusedIndex]?.focus()
  }, [open, focusedIndex, filteredLocales])

  function handleSelect(code: string) {
    setLocale(code)
    setAnnouncement(intl.formatMessage({ id: 'settings.locale.announce' }, { locale: SUPPORTED_LOCALES.find((item) => item.code === code)?.nativeLabel ?? code }))
    setOpen(false)
    onClose?.()
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') {
        setOpen(false)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusedIndex((current) => (current + 1) % filteredLocales.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setFocusedIndex((current) => (current - 1 + filteredLocales.length) % filteredLocales.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const target = filteredLocales[focusedIndex]
      if (target) handleSelect(target.code)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  return (
    <div className={className} dir={dir} lang={lang}>
      <button
        ref={triggerRef}
        type="button"
        className={`flex w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 ${compact ? 'min-h-11' : ''}`}
        aria-label={intl.formatMessage({ id: 'locale.picker.trigger.ariaLabel' })}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleKeyDown}
      >
        <span className="flex min-w-0 flex-col items-start text-left">
          <span className="truncate font-medium">{supportedLocale?.nativeLabel ?? locale}</span>
          <span className="text-xs text-zinc-500">{supportedLocale?.label ?? locale}</span>
        </span>
        <span className="ml-2 rounded-full border border-zinc-300 px-2 py-0.5 text-xs uppercase tracking-wide dark:border-zinc-700">
          {locale.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {SUPPORTED_LOCALES.length > 5 && (
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
              <input
                type="search"
                value={search}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                placeholder={intl.formatMessage({ id: 'settings.locale.search.placeholder' })}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setFocusedIndex(0)
                }}
              />
            </div>
          )}

          <div ref={listRef} id={listboxId} role="listbox" aria-label={intl.formatMessage({ id: 'locale.picker.listbox.ariaLabel' })} className="max-h-72 overflow-auto">
            {filteredLocales.length === 0 ? (
              <div className="px-3 py-4 text-sm text-zinc-500">{intl.formatMessage({ id: 'settings.locale.empty' })}</div>
            ) : (
              filteredLocales.map((option, index) => {
                const isActive = option.code === locale
                return (
                  <div
                    key={option.code}
                    role="option"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${isActive ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
                    onMouseEnter={() => setFocusedIndex(index)}
                    onClick={() => handleSelect(option.code)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelect(option.code)
                      }
                    }}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                        {isActive ? '✓' : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span dir="auto" className="block truncate font-medium">
                          {option.nativeLabel}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">{option.label}</span>
                      </span>
                    </span>
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
                      {option.code.toUpperCase()}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      <div id={liveRegionId} className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  )
}

export default LocalePicker
