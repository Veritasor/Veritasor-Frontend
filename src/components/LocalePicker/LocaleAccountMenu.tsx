import { useEffect, useId, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useLocale } from '../../i18n/useLocale'
import { SUPPORTED_LOCALES } from '../../i18n/config'
import LocalePicker from './LocalePicker'

const MOBILE_QUERY = '(max-width: 640px)'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(MOBILE_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

interface LocaleAccountMenuProps {
  className?: string
}

/**
 * Framework-level internationalization UX: an accessible account-menu entry that
 * hosts the locale picker, shows the current language in its own script alongside
 * the English label, and surfaces translator copy guidance. Dates, numbers, and
 * currencies follow the selected locale via the LocaleProvider.
 *
 * - Accessible: WCAG 2.1 AA. Trigger exposes aria-haspopup/aria-expanded, the panel
 *   is a labelled dialog, focus returns to the trigger on close, and Escape / outside
 *   click dismiss it.
 * - Responsive: collapses to a bottom sheet on small screens.
 * - RTL safe: inherits `dir` from the active locale context.
 */
export default function LocaleAccountMenu({ className = '' }: LocaleAccountMenuProps) {
  const intl = useIntl()
  const { locale, dir } = useLocale()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const isMobile = useIsMobile()
  const current = SUPPORTED_LOCALES.find((item) => item.code === locale) ?? SUPPORTED_LOCALES[0]

  useEffect(() => {
    if (!open) return

    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle() {
    setOpen((value) => !value)
  }

  function closeAndFocusTrigger() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const panelPositionClass = isMobile
    ? 'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-auto rounded-t-2xl border-t border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900'
    : 'absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900'

  return (
    <div ref={containerRef} className={`relative ${className}`} dir={dir}>
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={intl.formatMessage(
          { id: 'accountMenu.language.ariaLabel' },
          { language: current.nativeLabel },
        )}
        onClick={toggle}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span aria-hidden="true" className="text-base leading-none" lang={current.code}>
          {current.nativeLabel}
        </span>
        <span className="hidden text-xs text-zinc-500 sm:inline">{current.label}</span>
        <span className="rounded-full border border-zinc-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
          {current.code}
        </span>
        <span aria-hidden="true" className="text-zinc-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label={intl.formatMessage({ id: 'accountMenu.language.label' })}
          className={panelPositionClass}
        >
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {intl.formatMessage({ id: 'accountMenu.language.label' })}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {intl.formatMessage({ id: 'accountMenu.language.description' })}
            </p>
          </div>

          <div className="p-4">
            <LocalePicker onClose={closeAndFocusTrigger} />
          </div>

          <details className="border-t border-zinc-200 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
              {intl.formatMessage({ id: 'accountMenu.copyGuidance.title' })}
            </summary>
            <p className="mt-2 leading-relaxed">
              {intl.formatMessage({ id: 'accountMenu.copyGuidance.body' })}
            </p>
          </details>
        </div>
      )}
    </div>
  )
}
