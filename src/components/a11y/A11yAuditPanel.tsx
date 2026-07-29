import { useCallback, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ENTITY_LABEL,
  MOCK_ISSUES,
  SEVERITY_META,
  SEVERITY_ORDER,
  filterBySeverities,
  isA11ySeverity,
  matchesQuery,
  type A11yIssue,
  type A11ySeverity,
} from './a11yAuditData'
import { downloadIssuesCsv, issuesCsvFilename } from './a11yCsv'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseActiveSeverities(params: URLSearchParams): A11ySeverity[] {
  const raw = (params.get('severity') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const valid = raw.filter(isA11ySeverity)
  // Preserve canonical severity order in the URL value.
  valid.sort((a, b) => SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b))
  return valid
}

function truncate(s: string, max = 60): string {
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 1))}…`
}

// ---------------------------------------------------------------------------
// SeverityChip
// ---------------------------------------------------------------------------

interface SeverityChipProps {
  severity: A11ySeverity
  count: number
  active: boolean
  onToggle: () => void
}

function SeverityChip({ severity, count, active, onToggle }: SeverityChipProps) {
  const meta = SEVERITY_META[severity]
  const singular = count === 1 ? 'issue' : 'issues'
  return (
    <button
      type="button"
      className={`a11y-chip a11y-chip-${severity}${active ? ' a11y-chip-active' : ''}`}
      aria-pressed={active}
      aria-label={`${meta.ariaLabel} — ${count} ${singular}`}
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        minHeight: '2.5rem',
        padding: '0.4rem 0.85rem',
        border: `2px solid ${meta.cssVar}`,
        borderRadius: '999px',
        background: active ? meta.softCssVar : 'transparent',
        color: 'var(--text)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        letterSpacing: '0.02em',
        transition: 'background 140ms ease, transform 140ms ease',
        flexShrink: 0,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1, fontWeight: 700 }}>
        {meta.glyph}
      </span>
      <span>{meta.label}</span>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '1.6rem',
          height: '1.4rem',
          padding: '0 0.35rem',
          borderRadius: '999px',
          background: active ? meta.cssVar : 'var(--surface-soft)',
          color: active ? '#04111f' : 'var(--muted)',
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        {count}
      </span>
      <span className="sr-only">{count} {singular}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// A11yAuditPanel
// ---------------------------------------------------------------------------

export interface A11yAuditPanelProps {
  /**
   * Override the default mock fixtures — useful in tests or when a real
   * axe-core scan pipeline produces the issue list.
   */
  issues?: readonly A11yIssue[]
}

export default function A11yAuditPanel({ issues = MOCK_ISSUES }: A11yAuditPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [exportedAt, setExportedAt] = useState<string | null>(null)
  const liveRegionId = useId()

  const activeSeverities = parseActiveSeverities(searchParams)
  const query = searchParams.get('q') ?? ''

  // Severity counts are computed over the full fixture set so the chip
  // counts don't shift as the user filters (avoids confusion).
  const counts = useMemo(() => {
    const result: Record<A11ySeverity, number> = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    }
    for (const i of issues) {
      result[i.severity] += 1
    }
    return result
  }, [issues])

  const filtered = useMemo(() => {
    const bySev = filterBySeverities(issues, activeSeverities)
    return bySev.filter((i) => matchesQuery(i, query))
  }, [issues, activeSeverities, query])

  const totalCount = issues.length
  const isAllActive = activeSeverities.length === 0
  const isEmpty = filtered.length === 0
  const exportLabel = `Export ${filtered.length} ${filtered.length === 1 ? 'issue' : 'issues'} as CSV`

  // ── URL writers ──────────────────────────────────────────────────────────
  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const toggleSeverity = useCallback(
    (severity: A11ySeverity) => {
      const next = activeSeverities.includes(severity)
        ? activeSeverities.filter((s) => s !== severity)
        : [...activeSeverities, severity]
      next.sort(
        (a, b) => SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b),
      )
      setParam('severity', next.join(','))
    },
    [activeSeverities, setParam],
  )

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const handleExport = useCallback(() => {
    if (filtered.length === 0) return
    const filename = issuesCsvFilename()
    try {
      downloadIssuesCsv(filtered, filename)
      setExportedAt(new Date().toISOString())
      window.setTimeout(() => setExportedAt(null), 4000)
    } catch {
      // download failure is announced via the live region below.
      setExportedAt(null)
    }
  }, [filtered])

  // ── Copy text ────────────────────────────────────────────────────────────
  const resultLabel = totalCount === 0
    ? 'No accessibility issues recorded'
    : filtered.length === totalCount
      ? `Showing all ${filtered.length} ${filtered.length === 1 ? ENTITY_LABEL : `${ENTITY_LABEL}s`}`
      : `Showing ${filtered.length} of ${totalCount} ${ENTITY_LABEL}s`

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section
      aria-labelledby="a11y-audit-title"
      style={{ display: 'grid', gap: 'var(--density-gap)' }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h2
            id="a11y-audit-title"
            style={{ margin: 0, fontSize: 'var(--text-xl)', lineHeight: 1.2 }}
          >
            Accessibility audit
          </h2>
          <p
            style={{
              margin: '0.3rem 0 0',
              color: 'var(--muted)',
              lineHeight: 1.55,
              maxWidth: '52ch',
            }}
          >
            Triage WCAG findings across the dashboard. Filter by severity, then
            export the visible set as CSV for handoff to engineers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          aria-label={exportLabel}
          disabled={filtered.length === 0}
          title={filtered.length === 0 ? 'No issues to export' : exportLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            minHeight: '2.75rem',
            padding: '0.55rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            background: filtered.length === 0
              ? 'var(--surface-soft)'
              : 'linear-gradient(135deg, var(--accent), #60a5fa)',
            color: filtered.length === 0 ? 'var(--muted)' : '#04111f',
            cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M9 1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4z" />
            <polyline points="8,1 8,4 11,4" />
          </svg>
          Export CSV
        </button>
      </header>

      {/* ── Severity chip filters ───────────────────────────────────── */}
      <div
        role="group"
        aria-label="Filter by severity"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className="a11y-chip a11y-chip-all"
          aria-pressed={isAllActive}
          aria-label={`All severities — ${totalCount} ${totalCount === 1 ? 'issue' : 'issues'}`}
          onClick={() => setParam('severity', '')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            minHeight: '2.5rem',
            padding: '0.4rem 0.85rem',
            border: '2px solid var(--border)',
            borderRadius: '999px',
            background: isAllActive ? 'var(--surface-soft)' : 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          <span>All</span>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '1.6rem',
              height: '1.4rem',
              padding: '0 0.35rem',
              borderRadius: '999px',
              background: 'var(--surface-soft)',
              color: 'var(--muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            {totalCount}
          </span>
          <span className="sr-only">{totalCount} {totalCount === 1 ? 'issue' : 'issues'}</span>
        </button>

        {SEVERITY_ORDER.map((sev) => (
          <SeverityChip
            key={sev}
            severity={sev}
            count={counts[sev]}
            active={activeSeverities.includes(sev)}
            onToggle={() => toggleSeverity(sev)}
          />
        ))}

        {(activeSeverities.length > 0 || query) && (
          <button
            type="button"
            onClick={clearAll}
            className="a11y-clear-all"
            aria-label="Clear all filters"
            style={{
              marginLeft: 'auto',
              minHeight: '2.5rem',
              padding: '0.4rem 0.85rem',
              border: '1px solid var(--border)',
              borderRadius: '999px',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label
          htmlFor="a11y-search-input"
          style={{ fontWeight: 600, fontSize: '0.9rem' }}
        >
          Search
        </label>
        <input
          id="a11y-search-input"
          type="search"
          value={query}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Filter by selector, rule, or description"
          aria-label="Search accessibility issues"
          style={{
            flex: 1,
            minHeight: '2.5rem',
            padding: '0.45rem 0.85rem',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            background: 'var(--surface-strong)',
            color: 'var(--text)',
            fontSize: '0.9rem',
          }}
        />
      </div>

      {/* ── Results table or empty state ─────────────────────────────── */}
      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: 'var(--density-padding)',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--muted)',
            display: 'grid',
            gap: '0.4rem',
            placeItems: 'center',
            textAlign: 'center',
            minHeight: '6rem',
          }}
        >
          <strong style={{ color: 'var(--text)' }}>
            No accessibility issues match the current filter.
          </strong>
          <span>
            Adjust the severity chips or clear the search to see more results.
          </span>
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <table
            role="grid"
            aria-label="Accessibility issues"
            aria-describedby={liveRegionId}
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.88rem',
            }}
          >
            <caption className="sr-only">
              Accessibility issues matching the current filter. Columns: severity, rule, WCAG criterion, selector, description, documentation link.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-soft)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    width: '7rem',
                  }}
                >
                  Severity
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-soft)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Rule
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-soft)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    width: '5rem',
                  }}
                >
                  WCAG
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-soft)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Selector
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-soft)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Description
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-soft)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    width: '5rem',
                  }}
                >
                  <span className="sr-only">Actions</span>
                  <span aria-hidden="true">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((issue) => {
                const meta = SEVERITY_META[issue.severity]
                return (
                  <tr
                    key={issue.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td
                      style={{
                        padding: '0.65rem 0.85rem',
                        verticalAlign: 'top',
                      }}
                    >
                      <span
                        aria-label={meta.ariaLabel}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: `2px solid ${meta.cssVar}`,
                          background: meta.softCssVar,
                          color: 'var(--text)',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          letterSpacing: '0.02em',
                        }}
                      >
                        <span aria-hidden="true">{meta.glyph}</span>
                        <span>{meta.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'top' }}>
                      <code
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          color: 'var(--accent)',
                        }}
                      >
                        {issue.ruleId}
                      </code>
                      <div
                        style={{
                          marginTop: '0.2rem',
                          color: 'var(--text)',
                          fontWeight: 600,
                        }}
                      >
                        {issue.ruleName}
                      </div>
                      <div
                        style={{
                          marginTop: '0.2rem',
                          color: 'var(--muted)',
                          fontSize: '0.85rem',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ color: 'var(--text)' }}>Fix:</strong>{' '}
                        {issue.fixSuggestion}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.65rem 0.85rem',
                        verticalAlign: 'top',
                        color: 'var(--muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {issue.wcag}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'top' }}>
                      <code
                        title={issue.selector}
                        style={{
                          display: 'block',
                          maxWidth: '24rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: 'var(--surface-strong)',
                          color: 'var(--text)',
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        {truncate(issue.selector, 60)}
                      </code>
                      <div
                        style={{
                          marginTop: '0.2rem',
                          color: 'var(--muted)',
                          fontSize: '0.8rem',
                        }}
                      >
                        {issue.documentTitle}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.65rem 0.85rem',
                        verticalAlign: 'top',
                        color: 'var(--text)',
                        lineHeight: 1.55,
                        maxWidth: '32rem',
                      }}
                    >
                      {issue.description}
                      <div
                        style={{
                          marginTop: '0.3rem',
                          color: 'var(--muted)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <time dateTime={issue.detectedAt}>
                          {new Date(issue.detectedAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </time>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'top' }}>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${issue.ruleId} documentation (opens in a new tab)`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--accent)',
                        }}
                      >
                        Docs
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 11 11"
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M4.5 2H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.5" />
                          <path d="M7 1h3v3M10 1 5.5 5.5" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Live result count (announced + visible) ──────────────────── */}
      <p
        id={liveRegionId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          margin: 0,
          color: 'var(--muted)',
          fontSize: '0.85rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <span>{resultLabel}</span>
        {exportedAt && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              background: 'var(--success-soft)',
              color: 'var(--success)',
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <span aria-hidden="true">✓</span>
            CSV export triggered
          </span>
        )}
      </p>
    </section>
  )
}
