// ---------------------------------------------------------------------------
// A11y audit — CSV export
//
// Builds an RFC 4180-compliant CSV from a list of A11yIssue records and
// triggers a browser download via Blob + ObjectURL. The download path is
// injectable so unit tests can run in jsdom without polluting globals.
//
// CSV format:
//   UTF-8 with BOM (so Excel correctly detects the encoding on double-click)
//   Comma `,` as separator, CRLF (`\r\n`) as line terminator
//   Fields containing `,`, `"`, `\n`, or `\r` are wrapped in double quotes
//   Inner double quotes are escaped as `""`
//
// Columns (ordered for triage utility — severity first):
//   severity, rule_id, rule_name, wcag, selector, description,
//   fix_suggestion, element, url, document_title, detected_at
// ---------------------------------------------------------------------------

import {
  SEVERITY_ORDER,
  type A11yIssue,
  type A11ySeverity,
} from './a11yAuditData'

export const CSV_HEADERS = [
  'severity',
  'rule_id',
  'rule_name',
  'wcag',
  'selector',
  'description',
  'fix_suggestion',
  'element',
  'url',
  'document_title',
  'detected_at',
] as const

export type CsvHeader = (typeof CSV_HEADERS)[number]

/** Escape a single CSV field per RFC 4180. */
export function escapeCsvField(value: string): string {
  if (/["\n\r,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Sort issues so triagers see critical → serious → moderate → minor first. */
function sortBySeverity(issues: readonly A11yIssue[]): A11yIssue[] {
  return [...issues].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity as A11ySeverity) -
      SEVERITY_ORDER.indexOf(b.severity as A11ySeverity),
  )
}

/** Build the CSV body (string). Includes the header row. */
export function buildIssuesCsv(issues: readonly A11yIssue[]): string {
  const sorted = sortBySeverity(issues)
  const headerLine = CSV_HEADERS.join(',')
  const dataLines = sorted.map((i) => [
    i.severity,
    i.ruleId,
    i.ruleName,
    i.wcag,
    i.selector,
    i.description,
    i.fixSuggestion,
    i.element ?? '',
    i.url,
    i.documentTitle ?? '',
    i.detectedAt,
  ].map(escapeCsvField).join(','))
  return [headerLine, ...dataLines].join('\r\n')
}

/** Deterministic filename pattern: `veritasor-a11y-issues-YYYY-MM-DDTHH-MM-SS.csv`. */
export function issuesCsvFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `veritasor-a11y-issues-${stamp}.csv`
}

export interface DownloadDeps {
  /** Injected for jsdom tests; defaults to `globalThis.Blob`. */
  BlobCtor: typeof Blob
  /** Injected for jsdom tests; defaults to `window.URL`. */
  urlApi: { createObjectURL: (b: Blob) => string; revokeObjectURL: (s: string) => void }
  /** Injected for jsdom tests; defaults to `document`. */
  dom: Pick<Document, 'createElement' | 'body'>
  /** Optional timeout provider (for test injection). */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown
}

const defaultDeps = (): DownloadDeps => {
  if (typeof window === 'undefined') {
    throw new Error('downloadIssuesCsv: a browser `window` is required')
  }
  return {
    BlobCtor: Blob,
    urlApi: window.URL as unknown as {
      createObjectURL: (b: Blob) => string
      revokeObjectURL: (s: string) => void
    },
    dom: document,
    setTimeoutFn: (fn, ms) => setTimeout(fn, ms) as unknown,
  }
}

/**
 * Trigger a file download in the browser. Returns the filename used.
 * All DOM-touching dependencies can be overridden via the `deps` argument
 * so the unit tests can run in jsdom without modifying globals.
 */
export function downloadIssuesCsv(
  issues: readonly A11yIssue[],
  filename = issuesCsvFilename(),
  deps: Partial<DownloadDeps> = {},
): { filename: string; bytes: number; data: string } {
  const csv = buildIssuesCsv(issues)
  const merged = { ...defaultDeps(), ...deps }
  // UTF-8 BOM so Excel auto-detects the encoding.
  const blob = new merged.BlobCtor(['\ufeff', csv], {
    type: 'text/csv;charset=utf-8',
  })
  const url = merged.urlApi.createObjectURL(blob)
  const a = merged.dom.createElement('a')
  a.href = url
  a.download = filename
  // `style.display = 'none'` keeps the click() invisible to users, though
  // most browsers still require the element to be in the DOM for the click
  // to dispatch as a real user gesture in some engines.
  a.style.display = 'none'
  merged.dom.body.appendChild(a)
  a.click()
  merged.dom.body.removeChild(a)
  const revoke = () => merged.urlApi.revokeObjectURL(url)
  if (merged.setTimeoutFn) {
    merged.setTimeoutFn(revoke, 0)
  } else {
    setTimeout(revoke, 0)
  }
  return { filename, bytes: blob.size, data: csv }
}
