import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

// Approximate width of a separator (including gaps) — used for layout estimation
const SEPARATOR_WIDTH_EST = 28
const ELLIPSIS_BTN_WIDTH_EST = 44

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/** Calculate which item indices should be hidden based on available container width. */
function calculateHiddenIndices(
  measureEl: HTMLElement,
  itemsCount: number,
): Set<number> {
  // 2 or fewer items never need collapsing
  if (itemsCount <= 2) return new Set()

  const containerWidth = measureEl.getBoundingClientRect().width
  if (containerWidth <= 0) return new Set()

  const itemEls = measureEl.querySelectorAll<HTMLElement>('[data-bc-measure]')
  const widths: number[] = []
  itemEls.forEach((el) => widths.push(el.getBoundingClientRect().width))

  if (widths.length !== itemsCount) return new Set()

  // Check if all items fit
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) + (itemsCount - 1) * SEPARATOR_WIDTH_EST

  if (totalWidth <= containerWidth) return new Set()

  // Need to collapse. Hide middle items from index 1 toward itemsCount-2
  const newHidden = new Set<number>()
  for (let i = 1; i < itemsCount - 1; i++) {
    newHidden.add(i)
    const visibleWidths = widths.filter((_, idx) => !newHidden.has(idx))
    // Each hidden item removes 1 separator; ellipsis adds 1 separator after it
    const separatorCount = itemsCount - 1 - newHidden.size + 1
    const visibleTotal =
      visibleWidths.reduce((a, b) => a + b, 0) +
      separatorCount * SEPARATOR_WIDTH_EST +
      ELLIPSIS_BTN_WIDTH_EST
    if (visibleTotal <= containerWidth) break
  }

  return newHidden
}

export default function Breadcrumb({ items, maxLabelLength = 24 }: BreadcrumbProps) {
  const containerRef = useRef<HTMLOListElement>(null)
  const measureRef = useRef<HTMLOListElement>(null)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuFocusedIndex, setMenuFocusedIndex] = useState(-1)

  const triggerId = useId()
  const menuId = useId()

  const hasOverflow = hiddenIndices.size > 0
  const firstHiddenIndex = hasOverflow ? Math.min(...hiddenIndices) : -1

  // Build overflow items with their original indices for stable keys
  const overflowItems = useMemo(
    () =>
      items
        .map((item, i) => ({ item, index: i }))
        .filter(({ index }) => hiddenIndices.has(index)),
    [items, hiddenIndices],
  )

  // ─── Measurement ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const measureEl = measureRef.current
    if (!measureEl) return

    const newHidden = calculateHiddenIndices(measureEl, items.length)
    if (!setsEqual(newHidden, hiddenIndices)) {
      setHiddenIndices(newHidden)
    }
    // We intentionally only re-measure when items change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  // ResizeObserver for responsive re-measurement
  useEffect(() => {
    const measureEl = measureRef.current
    if (!measureEl) return

    const observer = new ResizeObserver(() => {
      const newHidden = calculateHiddenIndices(measureEl, items.length)
      setHiddenIndices((prev) => (setsEqual(newHidden, prev) ? prev : newHidden))
    })

    observer.observe(measureEl)
    return () => observer.disconnect()
  }, [items])

  // ─── Menu handlers ──────────────────────────────────────────────────────
  const openMenu = useCallback(() => {
    setMenuOpen(true)
    setMenuFocusedIndex(0)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setMenuFocusedIndex(-1)
  }, [])

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (menuOpen) closeMenu()
        else openMenu()
      }
      if (e.key === 'Escape' && menuOpen) {
        e.preventDefault()
        closeMenu()
      }
    },
    [menuOpen, openMenu, closeMenu],
  )

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMenuFocusedIndex((prev) =>
          prev < overflowItems.length - 1 ? prev + 1 : 0,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMenuFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : overflowItems.length - 1,
        )
        return
      }
      if (e.key === 'Tab') {
        closeMenu()
      }
    },
    [overflowItems.length, closeMenu],
  )

  // Close on click outside
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.closest(`#${CSS.escape(menuId)}`) ||
        target.closest(`#${CSS.escape(triggerId)}`)
      ) {
        return
      }
      closeMenu()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, menuId, triggerId, closeMenu])

  // ─── Empty state ────────────────────────────────────────────────────────
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      {/* Hidden measurement layer — always renders all items for width calc */}
      <ol
        ref={measureRef}
        className="breadcrumb-list breadcrumb-measure"
        aria-hidden="true"
      >
        {items.map((item, index) => {
          const { display } = truncateLabel(item.label, maxLabelLength)
          return (
            <li key={index} className="breadcrumb-item" data-bc-measure>
              <span className="breadcrumb-link">{display}</span>
              {index < items.length - 1 && (
                <span className="breadcrumb-separator">/</span>
              )}
            </li>
          )
        })}
      </ol>

      {/* Visible layer */}
      <ol ref={containerRef} className="breadcrumb-list" data-testid="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isHidden = hiddenIndices.has(index)
          const showEllipsisHere = isHidden && index === firstHiddenIndex

          // Render ellipsis trigger at the first hidden position
          if (showEllipsisHere) {
            return (
              <li key={`ellipsis-${index}`} className="breadcrumb-item">
                <span className="breadcrumb-ellipsis-wrapper">
                  <button
                    id={triggerId}
                    type="button"
                    className="breadcrumb-ellipsis-btn"
                    aria-expanded={menuOpen}
                    aria-controls={menuId}
                    aria-haspopup="menu"
                    aria-label={`Show ${overflowItems.length} hidden breadcrumb${overflowItems.length > 1 ? 's' : ''}`}
                    onClick={() => (menuOpen ? closeMenu() : openMenu())}
                    onKeyDown={handleTriggerKeyDown}
                  >
                    …
                  </button>
                  {menuOpen && (
                    <div
                      id={menuId}
                      className="breadcrumb-overflow-menu"
                      role="menu"
                      aria-label="Hidden breadcrumbs"
                      onKeyDown={handleMenuKeyDown}
                    >
                      <ul className="breadcrumb-overflow-list" role="none">
                        {overflowItems.map(({ item: oi, index: origIdx }, posIdx) => {
                          const { display, truncated } = truncateLabel(oi.label, maxLabelLength)
                          const isFocused = posIdx === menuFocusedIndex

                          return (
                            <li key={origIdx} role="none">
                              {oi.href ? (
                                <Link
                                  to={oi.href}
                                  className={`breadcrumb-overflow-link${isFocused ? ' breadcrumb-overflow-link-focused' : ''}`}
                                  role="menuitem"
                                  tabIndex={isFocused ? 0 : -1}
                                  title={truncated ? oi.label : undefined}
                                  onClick={closeMenu}
                                  onMouseEnter={() => setMenuFocusedIndex(posIdx)}
                                >
                                  {display}
                                </Link>
                              ) : (
                                <span
                                  className={`breadcrumb-overflow-link${isFocused ? ' breadcrumb-overflow-link-focused' : ''}`}
                                  role="menuitem"
                                  tabIndex={isFocused ? 0 : -1}
                                  title={truncated ? oi.label : undefined}
                                  onMouseEnter={() => setMenuFocusedIndex(posIdx)}
                                >
                                  {display}
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </span>
                <span className="breadcrumb-separator" aria-hidden="true">/</span>
              </li>
            )
          }

          // Skip other hidden items
          if (isHidden) return null

          const { display, truncated } = truncateLabel(item.label, maxLabelLength)

          return (
            <li key={index} className="breadcrumb-item">
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
                  className="breadcrumb-current"
                  title={truncated ? item.label : undefined}
                >
                  {display}
                </span>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">/</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
