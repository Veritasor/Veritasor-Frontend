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
  if (!items || items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const listItem: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
      }
      if (item.href) {
        const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
        listItem.item = new URL(item.href, base).href
      }
      return listItem
    })
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol className="breadcrumb-list">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
