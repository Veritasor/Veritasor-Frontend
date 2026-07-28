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
