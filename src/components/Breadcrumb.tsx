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

const ELLIPSIS = '…'
const DEFAULT_MAX_LABEL_LENGTH = 24
const UNKNOWN_SEGMENT_LABEL = 'Unknown'

/**
 * ASCII control characters (C0 + DEL) and Unicode bidirectional override /
 * isolate controls that can spoof or break navigation chrome when untrusted
 * route parameters are rendered.
 */
// eslint-disable-next-line no-control-regex
const UNSAFE_CONTROL_CHARS = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g

/** Canonical labels for known static route segments. */
// eslint-disable-next-line react-refresh/only-export-components
export const KNOWN_SEGMENT_LABELS: Readonly<Record<string, string>> = {
  dashboard: 'Dashboard',
  attestations: 'Attestations',
  onboarding: 'Onboarding',
  sources: 'Revenue sources',
  settings: 'Settings',
  'api-keys': 'API keys',
  help: 'Help',
  'consent-preferences': 'Consent preferences',
  'connect-source': 'Connect source',
}

/** Decode percent-encoding without throwing on malformed byte sequences. */
function safeDecodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Sanitize a dynamic route segment (e.g. `attestations/:id`) for safe display
 * in navigation chrome. Decodes valid percent-encoding, strips control and
 * BiDi spoofing characters, and trims whitespace. React text escaping and
 * `serializeJsonLd` handle HTML/script escaping; `truncateLabel` caps length.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function sanitizeDynamicSegment(value: unknown): string {
  if (typeof value !== 'string') return ''
  return safeDecodeSegment(value).replace(UNSAFE_CONTROL_CHARS, '').trim()
}

/**
 * Convert an unknown URL path segment into a human-readable fallback label
 * (e.g. `business-details` → `Business Details`, `my_custom_page` → `My Custom Page`).
 * Returns `"Unknown"` when no printable characters remain after sanitization.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function humanizeSegment(segment: unknown): string {
  if (typeof segment !== 'string') return UNKNOWN_SEGMENT_LABEL
  const cleaned = safeDecodeSegment(segment)
    .replace(UNSAFE_CONTROL_CHARS, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return UNKNOWN_SEGMENT_LABEL

  return cleaned
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')
}

/**
 * Build breadcrumb items from a URL pathname.
 * - Dynamic segments (`attestations/:id`) are sanitized (preserving the raw ID
 *   text so React and JSON-LD escape it and `Breadcrumb` truncates it).
 * - Known static segments use `knownLabels` (defaults to `KNOWN_SEGMENT_LABELS`).
 * - Unknown segments fall back to a humanised label via `humanizeSegment`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function buildBreadcrumbItems(
  pathname: string,
  knownLabels: Readonly<Record<string, string>> = KNOWN_SEGMENT_LABELS,
): BreadcrumbItem[] {
  const pathOnly = pathname.split(/[?#]/, 1)[0] ?? ''
  const rawSegments = pathOnly.split('/').filter(Boolean)
  if (rawSegments.length === 0) return []

  const items: BreadcrumbItem[] = []
  let cumulativePath = ''

  for (let i = 0; i < rawSegments.length; i++) {
    const raw = rawSegments[i]
    const prev = i > 0 ? rawSegments[i - 1].toLowerCase() : ''
    cumulativePath += `/${raw}`

    const isLast = i === rawSegments.length - 1
    const isDynamicAttestationId = prev === 'attestations'

    let label: string
    if (isDynamicAttestationId) {
      label = sanitizeDynamicSegment(raw) || UNKNOWN_SEGMENT_LABEL
    } else {
      const known = knownLabels[raw.toLowerCase()]
      label = known ?? humanizeSegment(raw)
    }

    items.push(isLast ? { label } : { label, href: cumulativePath })
  }

  return items
}

/**
 * Crumb labels arrive from route definitions and API payloads, so they are not
 * guaranteed to be strings at runtime. Coerce anything unusable to an empty
 * label so a single bad item cannot take down the whole navigation.
 */
function normalizeLabel(label: unknown): string {
  return typeof label === 'string' ? label : ''
}

function truncateLabel(label: string, max: number): { display: string; truncated: boolean } {
  // A limit below 1 cannot fit even the ellipsis on its own; clamping keeps the
  // slice bound positive. Slicing with a non-positive bound would return
  // "everything but the tail", which *lengthens* the label it is meant to shorten.
  const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : DEFAULT_MAX_LABEL_LENGTH
  if (label.length <= limit) return { display: label, truncated: false }
  return { display: label.slice(0, limit - 1) + ELLIPSIS, truncated: true }
}

/** Resolve a crumb href against the current origin, or null when unparseable or unsafe. */
function toAbsoluteUrl(href: string, base: string): string | null {
  try {
    const parsed = new URL(href, base)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.href
  } catch {
    // A malformed href must not throw during render: the surrounding page
    // would unmount. The crumb still renders; only the JSON-LD item is dropped.
    return null
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

export default function Breadcrumb({ items, maxLabelLength = DEFAULT_MAX_LABEL_LENGTH }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const listItem: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: normalizeLabel(item.label),
      }
      if (item.href) {
        const absolute = toAbsoluteUrl(item.href, base)
        if (absolute) listItem.item = absolute
      }
      return listItem
    })
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol className="breadcrumb-list" data-testid="breadcrumb-list">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            const label = normalizeLabel(item.label)
            const { display, truncated } = truncateLabel(label, maxLabelLength)
            const hasSafeHref = Boolean(item.href && toAbsoluteUrl(item.href, base) !== null)

            return (
              <li key={index} className="breadcrumb-item">
                {!isLast && hasSafeHref && item.href ? (
                  <Link
                    to={item.href}
                    className="breadcrumb-link"
                    title={truncated ? label : undefined}
                  >
                    {display}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className="breadcrumb-current"
                    title={truncated ? label : undefined}
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </>
  )
}
