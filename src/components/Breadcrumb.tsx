import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  /** Max characters before a crumb label is truncated with an ellipsis. Default: 24 */
  maxLabelLength?: number
}

function truncateLabel(label: string, max: number): { display: string; truncated: boolean } {
  if (label.length <= max) return { display: label, truncated: false }
  return { display: label.slice(0, max - 1) + '…', truncated: true }
}

const SEPARATOR_WIDTH_EST = 28
const ELLIPSIS_BTN_WIDTH_EST = 44

/**
 * Crumb labels arrive from route definitions and API payloads, so they are not
 * guaranteed to be strings at runtime. Coerce anything unusable to an empty
 * label so a single bad item cannot take down the whole navigation.
 */
function normalizeLabel(label: unknown): string {
  return typeof label === 'string' ? label : ''
}

function calculateHiddenIndices(
  measureEl: HTMLElement,
  itemsCount: number,
): Set<number> {
  if (itemsCount <= 2) return new Set()

  const containerWidth = measureEl.getBoundingClientRect().width
  if (containerWidth <= 0) return new Set()

  const itemEls = measureEl.querySelectorAll<HTMLElement>('[data-bc-measure]')
  const widths: number[] = []
  itemEls.forEach((el) => widths.push(el.getBoundingClientRect().width))

  if (widths.length !== itemsCount) return new Set()

  const totalWidth =
    widths.reduce((a, b) => a + b, 0) + (itemsCount - 1) * SEPARATOR_WIDTH_EST

  if (totalWidth <= containerWidth) return new Set()

  const newHidden = new Set<number>()
  for (let i = 1; i < itemsCount - 1; i++) {
    newHidden.add(i)
    const visibleWidths = widths.filter((_, idx) => !newHidden.has(idx))
    const separatorCount = itemsCount - 1 - newHidden.size + 1
    const visibleTotal =
      visibleWidths.reduce((a, b) => a + b, 0) +
      separatorCount * SEPARATOR_WIDTH_EST +
      ELLIPSIS_BTN_WIDTH_EST
    if (visibleTotal <= containerWidth) break
  }
}

/**
 * Serialize JSON-LD for inline injection. `</script>` inside a label would
 * otherwise close the script element as soon as the document is parsed, so
 * escape the characters HTML treats as markup. Consumers see identical strings
 * after `JSON.parse`.
 */
function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export default function Breadcrumb({ items, maxLabelLength = 24 }: BreadcrumbProps) {
  if (!items || items.length === 0) return null

  const menuId = useId()
  const measureRef = useRef<HTMLDivElement>(null)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Measure and compute overflow after layout
  useLayoutEffect(() => {
    if (!measureRef.current) return
    const next = calculateHiddenIndices(measureRef.current, items.length)
    setHiddenIndices((prev) => (setsEqual(prev, next) ? prev : next))
  }, [items])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const menuEl = document.getElementById(menuId)
      if (menuEl && menuEl.contains(target)) return
      if (btnRef.current && btnRef.current.contains(target)) return
      setMenuOpen(false)
      setFocusedIndex(-1)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen, menuId])

  const hiddenItems = items.filter((_, i) => hiddenIndices.has(i))

  const handleEllipsisClick = useCallback(() => {
    setMenuOpen((v) => !v)
    setFocusedIndex(0)
  }, [])

  const handleEllipsisKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setMenuOpen((v) => !v)
      setFocusedIndex(0)
    }
  }, [])

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setFocusedIndex(0)
        btnRef.current?.focus()
        return
      }
      if (e.key === 'Tab') {
        setMenuOpen(false)
        setFocusedIndex(0)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev >= hiddenItems.length - 1 ? 0 : prev + 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev <= 0 ? hiddenItems.length - 1 : prev - 1))
        return
      }
    },
    [hiddenItems.length],
  )

  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const listItem: Record<string, unknown> = {
        '@type': 'ListItem',
        position: index + 1,
        name: normalizeLabel(item.label),
      }
      if (item.href) {
        const absolute = toAbsoluteUrl(item.href, base)
        if (absolute) listItem.item = absolute
      }
      return listItem
    }),
  }

  const hasOverflow = hiddenIndices.size > 0

  return (
    <>
      {/* Measurement layer — hidden from view, used to compute widths */}
      <div
        ref={measureRef}
        className="breadcrumb-measure"
        aria-hidden="true"
        style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' }}
      >
        {items.map((item, i) => (
          <span key={i} data-bc-measure="">
            <span>{item.label}</span>
          </span>
        ))}
      </div>

      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol className="breadcrumb-list" data-testid="breadcrumb-list">
          {items.map((item, index) => {
            if (hiddenIndices.has(index)) return null

            const isLast = index === items.length - 1
            const isFirst = index === 0
            const { display, truncated } = truncateLabel(item.label, maxLabelLength)

            // Insert ellipsis button after the first visible item when there is overflow
            const showEllipsisAfter = hasOverflow && isFirst

            return (
              <>
                <li key={`item-${index}`} className="breadcrumb-item">
                  {!isLast && item.href ? (
                    <Link
                      to={item.href}
                      className="breadcrumb-link"
                      title={truncated ? item.label : undefined}
                    >
                      {display}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={isLast ? 'breadcrumb-current' : 'breadcrumb-crumb'}
                      title={truncated ? item.label : undefined}
                    >
                      {display}
                    </span>
                  )}
                  {!isLast && (
                    <span className="breadcrumb-separator" aria-hidden="true">/</span>
                  )}
                </li>

                {showEllipsisAfter && (
                  <li key="ellipsis" className="breadcrumb-item breadcrumb-ellipsis-item">
                    <button
                      ref={btnRef}
                      type="button"
                      className="breadcrumb-ellipsis-btn"
                      aria-label={`${hiddenItems.length} hidden breadcrumbs`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-controls={menuId}
                      onClick={handleEllipsisClick}
                      onKeyDown={handleEllipsisKeyDown}
                    >
                      …
                    </button>
                    {menuOpen && (
                      <ul
                        id={menuId}
                        role="menu"
                        className="breadcrumb-overflow-menu"
                        onKeyDown={handleMenuKeyDown}
                      >
                        {hiddenItems.map((hidden, mi) => (
                          <li key={mi} role="none">
                            {hidden.href ? (
                              <a
                                role="menuitem"
                                href={hidden.href}
                                className={`breadcrumb-overflow-link${focusedIndex === mi ? ' breadcrumb-overflow-link-focused' : ''}`}
                                onClick={() => {
                                  setMenuOpen(false)
                                  setFocusedIndex(-1)
                                }}
                              >
                                {hidden.label}
                              </a>
                            ) : (
                              <span
                                role="menuitem"
                                className={`breadcrumb-overflow-link${focusedIndex === mi ? ' breadcrumb-overflow-link-focused' : ''}`}
                              >
                                {hidden.label}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="breadcrumb-separator" aria-hidden="true">/</span>
                  </li>
                )}
              </>
            )
          })}
        </ol>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </>
  )
}
