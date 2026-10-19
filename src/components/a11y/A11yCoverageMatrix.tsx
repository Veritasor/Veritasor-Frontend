/**
 * A11yCoverageMatrix
 *
 * Maps design-system components to WCAG 2.1 AA success criteria, showing
 * which are covered by automated axe-core tests vs. manual review.
 *
 * Usage:
 *   <A11yCoverageMatrix />
 *
 * The table is designed to be print-friendly — see A11yCoverageMatrix.print.css.
 */

import { useMemo, type CSSProperties } from 'react'
import './A11yCoverageMatrix.print.css'

// ─── Types ───────────────────────────────────────────────────────────────

export type TestMethod = 'automated' | 'manual' | 'partial' | 'none'

export interface WcagCriterion {
  id: string
  /** WCAG SC number, e.g. "1.1.1" */
  sc: string
  /** Short description, e.g. "Non-text Content" */
  label: string
  /** Level: A, AA, AAA */
  level: 'A' | 'AA' | 'AAA'
}

export interface ComponentCoverage {
  /** Design-system component name */
  component: string
  /** Per-criterion coverage status */
  criteria: Record<string, TestMethod>
}

// ─── Data ────────────────────────────────────────────────────────────────

export const WCAG_CRITERIA: WcagCriterion[] = [
  { id: '1.1.1',   sc: '1.1.1',   label: 'Non-text Content',               level: 'A'   },
  { id: '1.3.1',   sc: '1.3.1',   label: 'Info and Relationships',         level: 'A'   },
  { id: '1.3.2',   sc: '1.3.2',   label: 'Meaningful Sequence',            level: 'A'   },
  { id: '1.4.1',   sc: '1.4.1',   label: 'Use of Color',                   level: 'A'   },
  { id: '1.4.3',   sc: '1.4.3',   label: 'Contrast (Minimum)',             level: 'AA'  },
  { id: '1.4.4',   sc: '1.4.4',   label: 'Resize Text',                    level: 'AA'  },
  { id: '1.4.10',  sc: '1.4.10',  label: 'Reflow',                         level: 'AA'  },
  { id: '1.4.11',  sc: '1.4.11',  label: 'Non-text Contrast',              level: 'AA'  },
  { id: '2.1.1',   sc: '2.1.1',   label: 'Keyboard',                       level: 'A'   },
  { id: '2.4.3',   sc: '2.4.3',   label: 'Focus Order',                    level: 'A'   },
  { id: '2.4.4',   sc: '2.4.4',   label: 'Link Purpose (In Context)',      level: 'A'   },
  { id: '2.4.7',   sc: '2.4.7',   label: 'Focus Visible',                  level: 'AA'  },
  { id: '2.5.3',   sc: '2.5.3',   label: 'Label in Name',                  level: 'A'   },
  { id: '3.2.1',   sc: '3.2.1',   label: 'On Focus',                       level: 'A'   },
  { id: '3.3.2',   sc: '3.3.2',   label: 'Labels or Instructions',         level: 'A'   },
  { id: '4.1.2',   sc: '4.1.2',   label: 'Name, Role, Value',              level: 'A'   },
  { id: '4.1.3',   sc: '4.1.3',   label: 'Status Messages',                level: 'AA'  },
] as const

export interface ComponentCoverageEntry {
  component: string
  criteria: Record<string, TestMethod>
}

export const COMPONENT_COVERAGE: ComponentCoverageEntry[] = [
  {
    component: 'Button',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.1':  'manual',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '2.5.3':  'manual',
      '3.2.1':  'manual',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Input',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '2.5.3':  'automated',
      '3.3.2':  'automated',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Select',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '3.3.2':  'automated',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Link',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.1':  'manual',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.4':  'manual',
      '2.4.7':  'automated',
      '2.5.3':  'manual',
      '3.2.1':  'manual',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Badge / Chip',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.1':  'manual',
      '1.4.3':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.7':  'automated',
      '2.5.3':  'manual',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Toast / Notification',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '4.1.2':  'automated',
      '4.1.3':  'automated',
    },
  },
  {
    component: 'Modal / Dialog',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.1':  'manual',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '3.2.1':  'manual',
      '4.1.2':  'automated',
      '4.1.3':  'manual',
    },
  },
  {
    component: 'Table',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.3.2':  'manual',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.10': 'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Navigation / Tabs',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.3.2':  'manual',
      '1.4.1':  'manual',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '3.2.1':  'manual',
      '4.1.2':  'automated',
      '4.1.3':  'manual',
    },
  },
  {
    component: 'Form / Fieldset',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.3':  'automated',
      '1.4.4':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'automated',
      '2.4.3':  'manual',
      '2.4.7':  'automated',
      '2.5.3':  'automated',
      '3.3.2':  'automated',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Avatar',
    criteria: {
      '1.1.1':  'automated',
      '1.3.1':  'automated',
      '1.4.3':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'none',
      '2.4.7':  'automated',
      '4.1.2':  'automated',
    },
  },
  {
    component: 'Progress Indicator',
    criteria: {
      '1.1.1':  'none',
      '1.3.1':  'automated',
      '1.4.1':  'manual',
      '1.4.3':  'automated',
      '1.4.11': 'automated',
      '2.1.1':  'none',
      '2.4.7':  'automated',
      '4.1.2':  'automated',
      '4.1.3':  'manual',
    },
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────

const METHOD_META: Record<TestMethod, { label: string; color: string; bg: string; border: string }> = {
  automated: { label: 'Auto', color: 'var(--success)', bg: 'var(--success-soft)', border: 'rgba(52, 211, 153, 0.35)' },
  manual:    { label: 'Manual', color: '#f59e0b', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.35)' },
  partial:   { label: 'Partial', color: 'var(--warning)', bg: 'var(--warning-soft)', border: 'rgba(251, 191, 36, 0.35)' },
  none:      { label: '—', color: 'var(--muted)', bg: 'transparent', border: 'transparent' },
}

function StatusChip({ method }: { method: TestMethod }) {
  const meta = METHOD_META[method]
  if (method === 'none') {
    return (
      <span
        className="a11y-matrix-chip"
        aria-label="Not covered"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '1.6rem', height: '1.4rem', borderRadius: 4,
          color: meta.color, fontSize: '0.7rem', lineHeight: 1,
        }}
      >
        —
      </span>
    )
  }
  return (
    <span
      className={`a11y-matrix-chip a11y-matrix-chip-${method}`}
      aria-label={`${meta.label} test coverage`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '0.15rem 0.45rem', borderRadius: 999,
        border: `1px solid ${meta.border}`, background: meta.bg,
        color: meta.color, fontWeight: 700, fontSize: '0.7rem',
        lineHeight: 1.3, whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  )
}

// ─── Component ───────────────────────────────────────────────────────────

export interface A11yCoverageMatrixProps {
  components?: ComponentCoverageEntry[]
}

export default function A11yCoverageMatrix({
  components = COMPONENT_COVERAGE,
}: A11yCoverageMatrixProps) {
  const criteria = WCAG_CRITERIA

  // Per-component summary counts
  const summaries = useMemo(() => {
    return components.map((c) => {
      const vals = Object.values(c.criteria)
      return {
        automated: vals.filter((v) => v === 'automated').length,
        manual: vals.filter((v) => v === 'manual').length,
        partial: vals.filter((v) => v === 'partial').length,
        none: vals.filter((v) => v === 'none').length,
        total: vals.length,
      }
    })
  }, [components])

  // Global summary
  const globalSummary = useMemo(() => {
    let automated = 0, manual = 0, partial = 0, none = 0, total = 0
    for (const c of components) {
      for (const v of Object.values(c.criteria)) {
        if (v === 'automated') automated++
        else if (v === 'manual') manual++
        else if (v === 'partial') partial++
        else if (v === 'none') none++
        total++
      }
    }
    return { automated, manual, partial, none, total }
  }, [components])

  const autoPct = globalSummary.total > 0
    ? Math.round((globalSummary.automated / globalSummary.total) * 100)
    : 0

  return (
    <section
      className="a11y-coverage-matrix"
      aria-label="Component-coverage matrix"
      style={{ display: 'grid', gap: 'var(--density-gap)' }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header>
        <h2
          id="a11y-matrix-title"
          style={{ margin: 0, fontSize: 'var(--text-xl)', lineHeight: 1.2 }}
        >
          Component-coverage matrix
        </h2>
        <p
          style={{
            margin: '0.3rem 0 0', color: 'var(--muted)',
            lineHeight: 1.55, maxWidth: '60ch',
          }}
        >
          Maps design-system components to WCAG 2.1 AA success criteria.
          <strong style={{ color: 'var(--text)' }}>
            {' '}{globalSummary.automated}/{globalSummary.total} criteria automated ({autoPct}%)
          </strong>
          — criteria not applicable to a component are left blank.
        </p>
      </header>

      {/* ── Global summary strip ───────────────────────────────── */}
      <div
        className="a11y-matrix-summary"
        aria-label="Coverage summary by test method"
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        {(['automated', 'manual', 'partial', 'none'] as TestMethod[]).map((method) => {
          const count = globalSummary[method]
          const meta = METHOD_META[method]
          return (
            <span
              key={method}
              className={`a11y-matrix-summary-key a11y-matrix-summary-key-${method}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              <StatusChip method={method} />
              <span>{meta.label}</span>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '1.4rem', height: '1.2rem', padding: '0 0.3rem',
                  borderRadius: 999, background: 'var(--surface-soft)',
                  color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 700,
                }}
                aria-label={`${count} ${meta.label.toLowerCase()} ${count === 1 ? 'criterion' : 'criteria'}`}
              >
                {count}
              </span>
            </span>
          )
        })}
      </div>

      {/* ── Table wrapper (horizontal scroll on small screens) ── */}
      <div style={{ overflowX: 'auto' }}>
        <table
          className="a11y-matrix-table"
          aria-labelledby="a11y-matrix-title"
          style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: '0.85rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <caption className="sr-only">
            Component-coverage matrix. Columns: component name, then one column
            per WCAG success criterion showing coverage status (Auto, Manual,
            Partial, or — for not applicable). Final column shows component
            summary.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="a11y-matrix-th a11y-matrix-th-component"
                style={{
                  position: 'sticky', left: 0, zIndex: 2,
                  textAlign: 'left', padding: '0.6rem 0.75rem',
                  borderBottom: '2px solid var(--border)',
                  background: 'var(--surface-soft)',
                  fontWeight: 700, fontSize: '0.78rem',
                  color: 'var(--muted)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', minWidth: '9rem',
                }}
              >
                Component
              </th>
              {criteria.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className="a11y-matrix-th"
                  title={`${c.sc} — ${c.label} (Level ${c.level})`}
                  style={{
                    textAlign: 'center', padding: '0.6rem 0.4rem',
                    borderBottom: '2px solid var(--border)',
                    background: 'var(--surface-soft)',
                    fontWeight: 700, fontSize: '0.7rem',
                    color: 'var(--muted)', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap', minWidth: '3.6rem',
                  }}
                >
                  <span className="sr-only">{c.sc}: {c.label}</span>
                  <span aria-hidden="true">{c.sc}</span>
                </th>
              ))}
              <th
                scope="col"
                className="a11y-matrix-th a11y-matrix-th-summary"
                style={{
                  textAlign: 'center', padding: '0.6rem 0.5rem',
                  borderBottom: '2px solid var(--border)',
                  background: 'var(--surface-soft)',
                  fontWeight: 700, fontSize: '0.72rem',
                  color: 'var(--muted)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', minWidth: '6rem',
                }}
              >
                <span className="sr-only">Component coverage summary</span>
                <span aria-hidden="true">Coverage</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {components.map((comp, idx) => {
              const summary = summaries[idx]
              const pct = summary.total > 0
                ? Math.round((summary.automated / summary.total) * 100)
                : 0
              return (
                <tr
                  key={comp.component}
                  className="a11y-matrix-row"
                  style={{
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {/* Component name */}
                  <th
                    scope="row"
                    className="a11y-matrix-cell-component"
                    style={{
                      position: 'sticky', left: 0, zIndex: 1,
                      textAlign: 'left', padding: '0.55rem 0.75rem',
                      fontWeight: 700, fontSize: '0.88rem',
                      color: 'var(--text)',
                      background: 'var(--surface)',
                      borderRight: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {comp.component}
                  </th>

                  {/* Per-criterion chips */}
                  {criteria.map((c) => {
                    const method = comp.criteria[c.id] ?? 'none'
                    return (
                      <td
                        key={c.id}
                        className="a11y-matrix-cell"
                        style={{
                          textAlign: 'center', padding: '0.35rem 0.25rem',
                          verticalAlign: 'middle',
                        }}
                      >
                        <StatusChip method={method} />
                      </td>
                    )
                  })}

                  {/* Summary column */}
                  <td
                    className="a11y-matrix-cell-summary"
                    style={{
                      textAlign: 'center', padding: '0.35rem 0.5rem',
                      verticalAlign: 'middle',
                      fontSize: '0.78rem', fontWeight: 700,
                      color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--muted)',
                    }}
                    aria-label={`${summary.automated} of ${summary.total} criteria automated (${pct}%)`}
                  >
                    {summary.automated}/{summary.total}
                    <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                      {' '}({pct}%)
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Global summary row */}
          <tfoot>
            <tr
              className="a11y-matrix-footer"
              style={{
                borderTop: '2px solid var(--border)',
                background: 'var(--surface-soft)',
              }}
            >
              <th
                scope="row"
                className="a11y-matrix-cell-component"
                style={{
                  textAlign: 'left', padding: '0.55rem 0.75rem',
                  fontWeight: 700, fontSize: '0.82rem',
                  color: 'var(--text)',
                  background: 'var(--surface-soft)',
                  borderRight: '1px solid var(--border)',
                }}
              >
                Total
              </th>
              {criteria.map((c) => {
                // Count how many components cover this criterion
                let auto = 0, any = 0
                for (const comp of components) {
                  const m = comp.criteria[c.id]
                  if (m && m !== 'none') any++
                  if (m === 'automated') auto++
                }
                const totalPct = any > 0 ? Math.round((auto / any) * 100) : 0
                return (
                  <td
                    key={c.id}
                    className="a11y-matrix-cell"
                    style={{
                      textAlign: 'center', padding: '0.35rem 0.25rem',
                      verticalAlign: 'middle',
                      fontSize: '0.72rem', fontWeight: 700,
                      color: totalPct >= 80 ? 'var(--success)' : totalPct >= 50 ? 'var(--warning)' : 'var(--muted)',
                    }}
                    aria-label={`${auto} of ${any} components automated`}
                  >
                    {any > 0 ? `${auto}/${any}` : '—'}
                  </td>
                )
              })}
              <td
                className="a11y-matrix-cell-summary"
                style={{
                  textAlign: 'center', padding: '0.35rem 0.5rem',
                  verticalAlign: 'middle',
                  fontSize: '0.78rem', fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                {autoPct}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div
        className="a11y-matrix-legend"
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '1rem',
          fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6,
        }}
      >
        <span><StatusChip method="automated" /> Automated — covered by axe-core CI tests</span>
        <span><StatusChip method="manual" /> Manual — requires human review</span>
        <span><StatusChip method="partial" /> Partial — partially automated</span>
        <span><StatusChip method="none" /> — not applicable to this component</span>
      </div>

      {/* ── Print-only note ─────────────────────────────────────── */}
      <p className="a11y-matrix-print-url" style={{ display: 'none', color: 'var(--muted)', fontSize: '0.78rem' }}>
        Generated from the dashboard accessibility coverage matrix.
      </p>
    </section>
  )
}
