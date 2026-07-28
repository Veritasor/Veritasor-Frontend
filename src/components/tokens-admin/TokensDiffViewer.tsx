/* eslint-disable react/forbid-dom-props */

import { useId, useMemo, useState } from 'react'
import type { TokenCategory, TokenDiffEntry, ThemeVersion } from '../../tokens/types'
import { TOKEN_CATEGORIES } from '../../tokens/types'
import { computeTokenDiff, filterDiffByCategory } from '../../tokens/computeTokenDiff'
import { VERSION_A, VERSION_B } from '../../tokens/themeTokens'

type CategoryFilter = 'all' | TokenCategory

export type TokensDiffViewerProps = {
  /**
   * Optional theme versions to diff. Defaults to the built-in demo fixture
   * (`VERSION_A` \u2192 `VERSION_B`). Provide `{ versionA, versionB }` to swap in
   * API-sourced data without forking the component.
   */
  versions?: { versionA: ThemeVersion; versionB: ThemeVersion }
}

const ACTIVE_CATEGORIES: CategoryFilter[] = ['all', ...TOKEN_CATEGORIES] 

/**
 * Status metadata — text label, decorative icon character, and whether the
 * colour swatch is rendered for the side (Added/Removed show missing on one
 * side). All three states are conveyed by *icon + text*, never by colour
 * alone, so the component remains accessible.
 */
const STATUS_META: Record<
  TokenDiffEntry['status'],
  { label: string; icon: string; tone: 'positive' | 'negative' | 'neutral' }
> = {
  added: { label: 'Added', icon: '+', tone: 'positive' },
  removed: { label: 'Removed', icon: '−', tone: 'negative' },
  changed: { label: 'Changed', icon: '~', tone: 'neutral' },
}

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
  all: 'All categories',
  background: 'Background',
  border: 'Border',
  text: 'Text',
  accent: 'Accent',
  status: 'Status',
  spacing: 'Spacing',
  typography: 'Typography',
  radius: 'Radius',
  density: 'Density',
  shadow: 'Shadow',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TokensDiffViewer({ versions }: TokensDiffViewerProps = {}) {
  const filterGroupId = useId()
  const filterLabelId = `${filterGroupId}-label`
  const liveRegionId = `${filterGroupId}-live`

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all')

  // The component is data-driven — when `versions` is provided we use them,
  // otherwise we fall back to the bundled fixture.
  const versionA = versions?.versionA ?? VERSION_A
  const versionB = versions?.versionB ?? VERSION_B

  // The diff recomputes whenever the source versions change; the filtered
  // view recomputes when the active filter changes. Both memoisations are
  // safe because the inputs are stable references (fixture or props).
  const diff = useMemo(() => computeTokenDiff(versionA, versionB), [versionA, versionB])
  const visibleEntries = useMemo(
    () => filterDiffByCategory(diff, activeFilter),
    [diff, activeFilter],
  )

  const { summary } = diff

  return (
    <section className="tokens-diff" aria-labelledby="tokens-diff-heading">
      <header className="tokens-diff-header">
        <h2 id="tokens-diff-heading" className="tokens-diff-title">
          Design tokens — version diff
        </h2>
        <p className="tokens-diff-lede">
          Compare added, removed, and changed design tokens between two theme
          versions. Side-by-side swatches highlight the visual delta.
        </p>
      </header>

      {/* ── Version identifier row ───────────────────────────────────── */}
      <div className="tokens-diff-versions" aria-label="Comparing versions">
        <div className="tokens-diff-version-card">
          <span className="tokens-diff-version-eyebrow">From</span>
          <strong className="tokens-diff-version-name">{versionA.name}</strong>
          <span className="tokens-diff-version-date">Released {versionA.releasedAt}</span>
        </div>
        <span className="tokens-diff-version-divider" aria-hidden="true">
          →
        </span>
        <div className="tokens-diff-version-card">
          <span className="tokens-diff-version-eyebrow">To</span>
          <strong className="tokens-diff-version-name">{versionB.name}</strong>
          <span className="tokens-diff-version-date">Released {versionB.releasedAt}</span>
        </div>
      </div>

      {/* ── Summary chips ─────────────────────────────────────────────── */}
      <p className="tokens-diff-summary" aria-label={`${summary.added} added, ${summary.changed} changed, ${summary.removed} removed`}>
        <span className="td-summary-chip td-summary-added">
          <span aria-hidden="true">+</span>
          {summary.added} added
        </span>
        <span className="td-summary-chip td-summary-changed">
          <span aria-hidden="true">~</span>
          {summary.changed} changed
        </span>
        <span className="td-summary-chip td-summary-removed">
          <span aria-hidden="true">−</span>
          {summary.removed} removed
        </span>
      </p>

      {/* ── Category filter ───────────────────────────────────────────── */}
      <div
        className="tokens-diff-filter"
        role="group"
        aria-labelledby={filterLabelId}
        aria-controls={liveRegionId}
      >
        <span id={filterLabelId} className="sr-only">
          Filter diff by token category
        </span>
        <span className="tokens-diff-filter-label" aria-hidden="true">
          Filter by category
        </span>
        <div className="tokens-diff-filter-row">
          {ACTIVE_CATEGORIES.map((category) => {
            const isActive = category === activeFilter
            const id = `${filterGroupId}-${category}`
            return (
              <button
                key={category}
                id={id}
                type="button"
                className={`td-chip${isActive ? ' td-chip-active' : ''}`}
                aria-pressed={isActive}
                onClick={() => setActiveFilter(category)}
              >
                {CATEGORY_LABEL[category]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Live region announces filter change to AT users ───────────── */}
      <p
        id={liveRegionId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {visibleEntries.length === 0
          ? `No ${CATEGORY_LABEL[activeFilter].toLowerCase()} tokens in the diff.`
          : visibilityAnnouncement(activeFilter, visibleEntries.length, summary)}
      </p>

      {/* ── Diff list ─────────────────────────────────────────────────── */}
      {visibleEntries.length === 0 ? (
        <div id={`${filterGroupId}-empty`} className="tokens-diff-empty" role="status" aria-labelledby={`${filterGroupId}-empty-title`}>
          <span className="tokens-diff-empty-glyph" aria-hidden="true">∅</span>
          <p id={`${filterGroupId}-empty-title`}>No tokens in this category differ between the two versions.</p>
          <p className="tokens-diff-empty-hint">Try a different category or the “All categories” filter.</p>
        </div>
      ) : (
        <ul className="tokens-diff-list" aria-label="Token diff entries">
          {visibleEntries.map((entry) => (
            <DiffRow key={entry.name} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function DiffRow({ entry }: { entry: TokenDiffEntry }) {
  const meta = STATUS_META[entry.status]
  const rowLabel = `${entry.name}: ${meta.label}`

  return (
    <li className={`td-row td-row-${entry.status}`} aria-label={rowLabel}>
      <div className="td-row-head">
        <span className={`td-status-chip td-status-${meta.tone}`} aria-label={`Status: ${meta.label}`}>
          <span aria-hidden="true" className="td-status-icon">
            {meta.icon}
          </span>
          {meta.label}
        </span>
        <span className="td-row-category">{CATEGORY_LABEL[entry.category]}</span>
      </div>

      <div className="td-row-body">
        <span
          className={`td-cell td-cell-before${entry.before ? '' : ' td-cell-empty'}`}
          aria-label={
            entry.before
              ? `Before: ${entry.name} was ${entry.before.value}`
              : `Before: ${entry.name} did not exist in version A`
          }
        >
          {entry.before ? (
            <TokenValue token={entry.before} side="before" />
          ) : (
            <span className="td-cell-missing" aria-hidden="true">
              —
            </span>
          )}
        </span>

        <span className="td-row-arrow" aria-hidden="true">
          →
        </span>

        <span
          className={`td-cell td-cell-after${entry.after ? '' : ' td-cell-empty'}`}
          aria-label={
            entry.after
              ? `After: ${entry.name} is ${entry.after.value}`
              : `After: ${entry.name} removed in version B`
          }
        >
          {entry.after ? (
            <TokenValue token={entry.after} side="after" />
          ) : (
            <span className="td-cell-missing" aria-hidden="true">
              —
            </span>
          )}
        </span>
      </div>

      <div className="td-row-foot">
        <code className="td-row-name" aria-label={`Token ${entry.name}`}>
          {entry.name}
        </code>
      </div>
    </li>
  )
}

// ─── TokenValue: swatch vs. text ─────────────────────────────────────────────

function TokenValue({ token, side }: { token: TokenDiffEntry['before'] | TokenDiffEntry['after']; side: 'before' | 'after' }) {
  if (!token) return null
  // Visual swatch is decorative — the cell-level aria-label already announces
  // the value. The monospace text below it is the source-of-truth readout.
  return (
    <span className="td-value">
      {token.cssType === 'color' && isRenderable(token.value) ? (
        <>
          <span
            className={`td-swatch td-swatch-${side}`}
            style={{ background: token.value }}
            aria-hidden="true"
          />
          <span className="td-value-mono">{token.value}</span>
        </>
      ) : (
        <span className="td-value-mono">{token.value}</span>
      )}
    </span>
  )
}

// Some color tokens in design systems declare `transparent`, `inherit`, or
// gradients which cannot be safely painted as a swatch. In that case we fall
// back to a text-only monospace chip so the entry is still readable.
function isRenderable(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (!v) return false
  if (v === 'transparent' || v === 'inherit' || v === 'currentcolor') return false
  if (v.startsWith('linear-gradient') || v.startsWith('radial-gradient') || v.startsWith('conic-gradient')) return false
  return true
}

function visibilityAnnouncement(
  category: CategoryFilter,
  visibleCount: number,
  summary: { added: number; removed: number; changed: number },
) {
  const label = CATEGORY_LABEL[category].toLowerCase()
  // Single source of truth for the live region announcement — always reads
  // the summary so the parameter is consistently meaningful.
  return `Showing ${visibleCount} ${label} entries: ${summary.added} added, ${summary.changed} changed, ${summary.removed} removed.`
}
