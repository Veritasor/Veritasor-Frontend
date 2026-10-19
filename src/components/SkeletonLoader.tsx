/**
 * Skeleton Loading Components
 *
 * Provides accessible skeleton loaders for Dashboard and Attestations pages.
 * Implements WCAG 2.1 AA compliant loading states with:
 * - aria-busy attribute for screen reader announcement
 * - Shimmer animation with reduced motion support (pulse fallback)
 * - Responsive design matching final layouts
 *
 * ─── CrossfadeReveal ────────────────────────────────────────────────────────
 * The {@link CrossfadeReveal} component wraps a skeleton placeholder and its
 * real content in a stacked grid. When `loaded` becomes `true`, the skeleton
 * fades out while the content fades in simultaneously using CSS transitions.
 *
 * Key design decisions:
 * 1. **One-frame guarantee** – content is painted on the first frame that
 *    `loaded` flips to `true`; the fade merely animates its opacity from 0→1.
 *    There is zero artificial delay before the browser has the content.
 * 2. **Stagger** – pass `staggerIndex` (0-based integer) to offset the
 *    crossfade-in by `index × 40 ms`. The step is exposed as the CSS custom
 *    property `--crossfade-stagger-step` (default 40 ms) so it can be
 *    overridden per-container in a theme or at the call-site.
 * 3. **Reduced motion** – honours `prefers-reduced-motion: reduce`. When the
 *    media query matches, the CSS transitions are disabled so the swap is
 *    instant. The `loaded` prop still controls visibility; no JS sniffing is
 *    needed.
 * 4. **Screen reader safety** – the hidden layer is marked `visibility:
 *    hidden` so assistive technologies never announce content from it. The
 *    skeleton carries `aria-hidden="true"` once loaded so it is not traversed.
 *
 * @example Basic usage
 * ```tsx
 * <CrossfadeReveal loaded={!isLoading} skeleton={<MetricCardSkeleton />}>
 *   <MetricCard value={data.revenue} label="Revenue" />
 * </CrossfadeReveal>
 * ```
 *
 * @example Staggered list
 * ```tsx
 * {rows.map((row, idx) => (
 *   <CrossfadeReveal
 *     key={row.id}
 *     loaded={!isLoading}
 *     staggerIndex={idx}
 *     skeleton={<AttestationRowSkeleton />}
 *   >
 *     <AttestationRow {...row} />
 *   </CrossfadeReveal>
 * ))}
 * ```
 */

import React from 'react'

// ─── CrossfadeReveal ─────────────────────────────────────────────────────────

export interface CrossfadeRevealProps {
  /**
   * Whether the real content has finished loading.
   * `false` → skeleton is visible; `true` → content fades in, skeleton fades out.
   */
  loaded: boolean

  /** Skeleton placeholder element rendered behind the content layer. */
  skeleton: React.ReactNode

  /** Real content shown once loading completes. */
  children: React.ReactNode

  /**
   * Zero-based stagger index. Each unit adds one `--crossfade-stagger-step`
   * (default 40 ms) to the content's fade-in `transition-delay`.
   * Set to `0` (or omit) for no stagger.
   * @default 0
   */
  staggerIndex?: number

  /**
   * Extra class name applied to the outer `.crossfade-root` wrapper.
   * Use to customise layout or override stagger step per context:
   * ```css
   * .my-list { --crossfade-stagger-step: 60ms; }
   * ```
   */
  className?: string

  /** Forwarded to the outer wrapper for styling. */
  style?: React.CSSProperties
}

/**
 * Crossfade wrapper that transitions between a skeleton and real content.
 *
 * Both layers occupy the same grid cell. CSS opacity transitions drive the
 * swap; JS only toggles the `data-loaded` attribute. This keeps the animation
 * logic in CSS where it can be overridden with the `prefers-reduced-motion`
 * media query without any JS involvement.
 */
export function CrossfadeReveal({
  loaded,
  skeleton,
  children,
  staggerIndex = 0,
  className,
  style,
}: CrossfadeRevealProps) {
  const cssVars = {
    '--crossfade-index': staggerIndex,
    ...style,
  } as React.CSSProperties

  return (
    <div
      className={['crossfade-root', 'crossfade-stagger-item', className].filter(Boolean).join(' ')}
      data-loaded={loaded ? 'true' : 'false'}
      style={cssVars}
    >
      {/* Skeleton layer – hidden from AT once content is loaded */}
      <div
        className="crossfade-skeleton-layer"
        aria-hidden={loaded ? 'true' : undefined}
        data-testid="crossfade-skeleton"
      >
        {skeleton}
      </div>

      {/* Content layer – hidden from AT while loading */}
      <div
        className="crossfade-content-layer"
        aria-hidden={!loaded ? 'true' : undefined}
        data-testid="crossfade-content"
      >
        {children}
      </div>
    </div>
  )
}

// ─── DashboardSkeleton ───────────────────────────────────────────────────────

export interface DashboardSkeletonProps {
  /**
   * When provided, wraps this skeleton in a {@link CrossfadeReveal}.
   * Set to `true` once your data has resolved.
   */
  loaded?: boolean
  /** Real dashboard content to reveal on load (used with `loaded` prop). */
  children?: React.ReactNode
}

export function DashboardSkeleton({ loaded, children }: DashboardSkeletonProps = {}) {
  const skeleton = (
    <div
      className="loading-region"
      aria-busy="true"
      aria-label="Loading dashboard metrics"
      role="status"
    >
      <h2 style={{ marginTop: 0, fontSize: '1rem' }} className="skeleton skeleton-text" />

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <div className="skeleton-card-content">
          {/* Metrics grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="skeleton-metric">
                <div className="skeleton skeleton-metric-label" />
                <div className="skeleton skeleton-metric-value" />
              </div>
            ))}
          </div>

          {/* Actions list skeleton */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.95rem' }} className="skeleton skeleton-text-short" />
            <ul style={{ color: 'var(--muted)', listStyle: 'none', padding: 0, margin: '1rem 0 0 0' }}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <li key={idx} style={{ marginBottom: '0.75rem' }}>
                  <div className="skeleton skeleton-text-medium" style={{ marginBottom: 0 }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  // When loaded + children are provided, use CrossfadeReveal
  if (loaded !== undefined && children !== undefined) {
    return (
      <CrossfadeReveal loaded={loaded} skeleton={skeleton}>
        {children}
      </CrossfadeReveal>
    )
  }

  return skeleton
}

// ─── AttestationsSkeleton ────────────────────────────────────────────────────

export interface AttestationsSkeletonProps {
  /**
   * When provided, wraps this skeleton in a {@link CrossfadeReveal}.
   * Set to `true` once your data has resolved.
   */
  loaded?: boolean
  /** Real attestations content to reveal on load (used with `loaded` prop). */
  children?: React.ReactNode
}

export function AttestationsSkeleton({ loaded, children }: AttestationsSkeletonProps = {}) {
  const skeleton = (
    <div
      className="loading-region"
      aria-busy="true"
      aria-label="Loading attestations list"
      role="status"
    >
      <h2 style={{ marginTop: 0, fontSize: '1rem' }} className="skeleton skeleton-text" />

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <div className="skeleton-list">
          {/* Column headers skeleton */}
          <div className="skeleton-row-header" style={{ display: 'grid', marginBottom: '1rem' }}>
            <div className="skeleton skeleton-text-short" style={{ marginBottom: 0 }} />
            <div className="skeleton skeleton-text-short" style={{ marginBottom: 0 }} />
            <div className="skeleton skeleton-text-short" style={{ marginBottom: 0 }} />
          </div>

          {/* Row skeletons */}
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="skeleton-row">
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // When loaded + children are provided, use CrossfadeReveal
  if (loaded !== undefined && children !== undefined) {
    return (
      <CrossfadeReveal loaded={loaded} skeleton={skeleton}>
        {children}
      </CrossfadeReveal>
    )
  }

  return skeleton
}

// ─── MetricCardSkeleton ──────────────────────────────────────────────────────

export function MetricCardSkeleton() {
  return (
    <div className="skeleton-metric">
      <div className="skeleton skeleton-metric-label" />
      <div className="skeleton skeleton-metric-value" />
    </div>
  )
}

// ─── AttestationRowSkeleton ──────────────────────────────────────────────────

export function AttestationRowSkeleton() {
  return (
    <div className="skeleton-row">
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" />
    </div>
  )
}
