/**
 * SkeletonLoader Component Tests
 *
 * Covers:
 *   - CrossfadeReveal: loading state, loaded state, stagger, custom className/style,
 *     ARIA attributes, data-testid targets, default staggerIndex
 *   - DashboardSkeleton: standalone + crossfade mode
 *   - AttestationsSkeleton: standalone + crossfade mode
 *   - MetricCardSkeleton: structure
 *   - AttestationRowSkeleton: structure
 *   - Responsive + reduced-motion: CSS class presence (JS cannot run media queries
 *     in jsdom; we verify the CSS contract through class/attribute assertions)
 *
 * WCAG 2.1 AA assertions:
 *   - role="status" live region on each skeleton
 *   - aria-busy="true" while loading, absent when loaded
 *   - aria-hidden isolates the inactive layer from AT
 *   - Minimum touch target sizes are not layout-tested here (no visual renderer)
 *     but structural class requirements are verified.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  CrossfadeReveal,
  DashboardSkeleton,
  AttestationsSkeleton,
  MetricCardSkeleton,
  AttestationRowSkeleton,
} from './SkeletonLoader'

// ─── CrossfadeReveal ──────────────────────────────────────────────────────────

describe('CrossfadeReveal', () => {
  // ── data-loaded attribute ────────────────────────────────────────────────

  it('sets data-loaded="false" when loaded prop is false', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.querySelector('.crossfade-root')
    expect(root).toHaveAttribute('data-loaded', 'false')
  })

  it('sets data-loaded="true" when loaded prop is true', () => {
    const { container } = render(
      <CrossfadeReveal loaded={true} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.querySelector('.crossfade-root')
    expect(root).toHaveAttribute('data-loaded', 'true')
  })

  // ── layer rendering ──────────────────────────────────────────────────────

  it('renders skeleton content inside the skeleton layer', () => {
    render(
      <CrossfadeReveal loaded={false} skeleton={<span data-testid="skel-child">skeleton</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(screen.getByTestId('skel-child')).toBeInTheDocument()
  })

  it('renders children inside the content layer', () => {
    render(
      <CrossfadeReveal loaded={true} skeleton={<span>skel</span>}>
        <span data-testid="real-child">real</span>
      </CrossfadeReveal>,
    )
    expect(screen.getByTestId('real-child')).toBeInTheDocument()
  })

  it('renders both layers unconditionally (CSS controls visibility)', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.querySelector('[data-testid="crossfade-skeleton"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="crossfade-content"]')).toBeInTheDocument()
  })

  // ── ARIA ─────────────────────────────────────────────────────────────────

  it('adds aria-hidden to skeleton layer when loaded=true', () => {
    const { container } = render(
      <CrossfadeReveal loaded={true} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const skelLayer = container.querySelector('[data-testid="crossfade-skeleton"]')
    expect(skelLayer).toHaveAttribute('aria-hidden', 'true')
  })

  it('does NOT set aria-hidden on skeleton layer when loaded=false', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const skelLayer = container.querySelector('[data-testid="crossfade-skeleton"]')
    expect(skelLayer).not.toHaveAttribute('aria-hidden')
  })

  it('adds aria-hidden to content layer when loaded=false', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const contentLayer = container.querySelector('[data-testid="crossfade-content"]')
    expect(contentLayer).toHaveAttribute('aria-hidden', 'true')
  })

  it('does NOT set aria-hidden on content layer when loaded=true', () => {
    const { container } = render(
      <CrossfadeReveal loaded={true} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const contentLayer = container.querySelector('[data-testid="crossfade-content"]')
    expect(contentLayer).not.toHaveAttribute('aria-hidden')
  })

  // ── CSS classes ───────────────────────────────────────────────────────────

  it('applies crossfade-root and crossfade-stagger-item classes to root element', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('crossfade-root')
    expect(root).toHaveClass('crossfade-stagger-item')
  })

  it('applies crossfade-skeleton-layer class to skeleton wrapper', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-skeleton-layer')).toBeInTheDocument()
  })

  it('applies crossfade-content-layer class to content wrapper', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-content-layer')).toBeInTheDocument()
  })

  // ── staggerIndex / CSS custom property ───────────────────────────────────

  it('sets --crossfade-index to 0 by default', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.style.getPropertyValue('--crossfade-index')).toBe('0')
  })

  it('sets --crossfade-index to the provided staggerIndex', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} staggerIndex={3} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.style.getPropertyValue('--crossfade-index')).toBe('3')
  })

  it('accepts staggerIndex=0 explicitly', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} staggerIndex={0} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.style.getPropertyValue('--crossfade-index')).toBe('0')
  })

  // ── className forwarding ─────────────────────────────────────────────────

  it('merges extra className onto root element', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} className="my-custom" skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.firstChild).toHaveClass('my-custom')
    // base classes must still be present
    expect(container.firstChild).toHaveClass('crossfade-root')
  })

  it('does not add "undefined" to className when className is not provided', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toContain('undefined')
  })

  // ── style forwarding ──────────────────────────────────────────────────────

  it('merges extra inline styles onto root element', () => {
    const { container } = render(
      <CrossfadeReveal
        loaded={false}
        style={{ marginTop: '1rem' }}
        skeleton={<span>skel</span>}
      >
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.style.marginTop).toBe('1rem')
  })

  // ── transition between states ─────────────────────────────────────────────

  it('updates data-loaded attribute when loaded prop changes', () => {
    const { container, rerender } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-root')).toHaveAttribute('data-loaded', 'false')

    rerender(
      <CrossfadeReveal loaded={true} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-root')).toHaveAttribute('data-loaded', 'true')
  })

  it('flips ARIA attributes when transitioning from loading to loaded', () => {
    const { container, rerender } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    // while loading: content layer is aria-hidden
    expect(container.querySelector('[data-testid="crossfade-content"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(container.querySelector('[data-testid="crossfade-skeleton"]')).not.toHaveAttribute(
      'aria-hidden',
    )

    rerender(
      <CrossfadeReveal loaded={true} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    // after load: skeleton layer is aria-hidden
    expect(container.querySelector('[data-testid="crossfade-skeleton"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(container.querySelector('[data-testid="crossfade-content"]')).not.toHaveAttribute(
      'aria-hidden',
    )
  })
})

// ─── DashboardSkeleton ────────────────────────────────────────────────────────

describe('DashboardSkeleton', () => {
  // ── standalone mode ───────────────────────────────────────────────────────

  it('renders loading skeleton with WCAG status role and aria-busy', () => {
    const { container } = render(<DashboardSkeleton />)
    const region = container.querySelector('[role="status"]')
    expect(region).toBeInTheDocument()
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region).toHaveAttribute('aria-label', 'Loading dashboard metrics')
  })

  it('renders 4 metric skeleton cards in standalone mode', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.querySelectorAll('.skeleton-metric')).toHaveLength(4)
  })

  it('renders action-list skeleton items', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.querySelectorAll('li').length).toBeGreaterThanOrEqual(3)
  })

  it('has loading-region class', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.querySelector('.loading-region')).toBeInTheDocument()
  })

  it('has skeleton base class on multiple elements', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })

  it('renders skeleton-card-content for responsive grid', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.querySelector('.skeleton-card-content')).toBeInTheDocument()
  })

  // ── crossfade mode (loaded + children provided) ───────────────────────────

  it('renders inside CrossfadeReveal when loaded and children are provided', () => {
    const { container } = render(
      <DashboardSkeleton loaded={false}>
        <div data-testid="real-dashboard">Dashboard content</div>
      </DashboardSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).toBeInTheDocument()
    expect(screen.getByTestId('real-dashboard')).toBeInTheDocument()
  })

  it('sets data-loaded="false" when loaded=false with children', () => {
    const { container } = render(
      <DashboardSkeleton loaded={false}>
        <div>real</div>
      </DashboardSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).toHaveAttribute('data-loaded', 'false')
  })

  it('sets data-loaded="true" when loaded=true with children', () => {
    const { container } = render(
      <DashboardSkeleton loaded={true}>
        <div>real</div>
      </DashboardSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).toHaveAttribute('data-loaded', 'true')
  })

  it('reveals real content via content layer when loaded=true', () => {
    render(
      <DashboardSkeleton loaded={true}>
        <div data-testid="dashboard-real">Real dashboard</div>
      </DashboardSkeleton>,
    )
    expect(screen.getByTestId('dashboard-real')).toBeInTheDocument()
  })

  it('does NOT render CrossfadeReveal when only loaded is provided without children', () => {
    // loaded without children → falls through to standalone skeleton
    const { container } = render(<DashboardSkeleton loaded={false} />)
    expect(container.querySelector('.crossfade-root')).not.toBeInTheDocument()
    expect(container.querySelector('[role="status"]')).toBeInTheDocument()
  })

  it('does NOT render CrossfadeReveal when only children provided without loaded', () => {
    // children without loaded → falls through to standalone skeleton
    const { container } = render(
      <DashboardSkeleton>
        <div>content</div>
      </DashboardSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).not.toBeInTheDocument()
  })
})

// ─── AttestationsSkeleton ─────────────────────────────────────────────────────

describe('AttestationsSkeleton', () => {
  // ── standalone mode ───────────────────────────────────────────────────────

  it('renders loading skeleton with WCAG status role and aria-busy', () => {
    const { container } = render(<AttestationsSkeleton />)
    const region = container.querySelector('[role="status"]')
    expect(region).toBeInTheDocument()
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region).toHaveAttribute('aria-label', 'Loading attestations list')
  })

  it('renders 5 row skeletons in standalone mode', () => {
    const { container } = render(<AttestationsSkeleton />)
    expect(container.querySelectorAll('.skeleton-row')).toHaveLength(5)
  })

  it('renders column header skeleton', () => {
    const { container } = render(<AttestationsSkeleton />)
    expect(container.querySelector('.skeleton-row-header')).toBeInTheDocument()
  })

  it('has loading-region class', () => {
    const { container } = render(<AttestationsSkeleton />)
    expect(container.querySelector('.loading-region')).toBeInTheDocument()
  })

  it('has skeleton-list class for row container', () => {
    const { container } = render(<AttestationsSkeleton />)
    expect(container.querySelector('.skeleton-list')).toBeInTheDocument()
  })

  it('renders skeleton elements inside rows', () => {
    const { container } = render(<AttestationsSkeleton />)
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })

  // ── crossfade mode ────────────────────────────────────────────────────────

  it('renders inside CrossfadeReveal when loaded and children are provided', () => {
    const { container } = render(
      <AttestationsSkeleton loaded={false}>
        <div data-testid="real-attestations">Attestations content</div>
      </AttestationsSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).toBeInTheDocument()
    expect(screen.getByTestId('real-attestations')).toBeInTheDocument()
  })

  it('sets data-loaded="false" when loaded=false with children', () => {
    const { container } = render(
      <AttestationsSkeleton loaded={false}>
        <div>real</div>
      </AttestationsSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).toHaveAttribute('data-loaded', 'false')
  })

  it('sets data-loaded="true" when loaded=true with children', () => {
    const { container } = render(
      <AttestationsSkeleton loaded={true}>
        <div>real</div>
      </AttestationsSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).toHaveAttribute('data-loaded', 'true')
  })

  it('reveals real content via content layer when loaded=true', () => {
    render(
      <AttestationsSkeleton loaded={true}>
        <div data-testid="attestations-real">Real list</div>
      </AttestationsSkeleton>,
    )
    expect(screen.getByTestId('attestations-real')).toBeInTheDocument()
  })

  it('does NOT render CrossfadeReveal when only loaded is provided without children', () => {
    const { container } = render(<AttestationsSkeleton loaded={false} />)
    expect(container.querySelector('.crossfade-root')).not.toBeInTheDocument()
    expect(container.querySelector('[role="status"]')).toBeInTheDocument()
  })

  it('does NOT render CrossfadeReveal when only children provided without loaded', () => {
    const { container } = render(
      <AttestationsSkeleton>
        <div>content</div>
      </AttestationsSkeleton>,
    )
    expect(container.querySelector('.crossfade-root')).not.toBeInTheDocument()
  })
})

// ─── MetricCardSkeleton ───────────────────────────────────────────────────────

describe('MetricCardSkeleton', () => {
  it('renders skeleton-metric wrapper', () => {
    const { container } = render(<MetricCardSkeleton />)
    expect(container.querySelector('.skeleton-metric')).toBeInTheDocument()
  })

  it('renders metric-label skeleton', () => {
    const { container } = render(<MetricCardSkeleton />)
    expect(container.querySelector('.skeleton-metric-label')).toBeInTheDocument()
  })

  it('renders metric-value skeleton', () => {
    const { container } = render(<MetricCardSkeleton />)
    expect(container.querySelector('.skeleton-metric-value')).toBeInTheDocument()
  })

  it('applies base skeleton class to both child elements', () => {
    const { container } = render(<MetricCardSkeleton />)
    expect(container.querySelectorAll('.skeleton')).toHaveLength(2)
  })
})

// ─── AttestationRowSkeleton ───────────────────────────────────────────────────

describe('AttestationRowSkeleton', () => {
  it('renders skeleton-row wrapper', () => {
    const { container } = render(<AttestationRowSkeleton />)
    expect(container.querySelector('.skeleton-row')).toBeInTheDocument()
  })

  it('renders 3 skeleton-text elements (one per column)', () => {
    const { container } = render(<AttestationRowSkeleton />)
    expect(container.querySelectorAll('.skeleton-text')).toHaveLength(3)
  })

  it('applies base skeleton class to all text elements', () => {
    const { container } = render(<AttestationRowSkeleton />)
    expect(container.querySelectorAll('.skeleton')).toHaveLength(3)
  })
})

// ─── Stagger integration ──────────────────────────────────────────────────────

describe('Stagger integration', () => {
  it('applies incrementing --crossfade-index values to a list of CrossfadeReveal items', () => {
    const items = ['a', 'b', 'c']
    const { container } = render(
      <div>
        {items.map((item, idx) => (
          <CrossfadeReveal
            key={item}
            loaded={false}
            staggerIndex={idx}
            skeleton={<span>skel</span>}
          >
            <span>{item}</span>
          </CrossfadeReveal>
        ))}
      </div>,
    )
    const roots = container.querySelectorAll('.crossfade-root')
    expect(roots).toHaveLength(3)
    roots.forEach((root, idx) => {
      expect((root as HTMLElement).style.getPropertyValue('--crossfade-index')).toBe(String(idx))
    })
  })
})

// ─── Responsive and CSS class contract ────────────────────────────────────────
// jsdom does not compute media-query-dependent styles, so these tests verify
// that the required CSS class/attribute contracts exist for the stylesheet to
// target. Visual rendering is verified in manual/visual regression tests.

describe('CSS class contract for responsive and reduced-motion', () => {
  it('loading-region has aria-busy attribute for pointer-events CSS rule', () => {
    const { container } = render(<DashboardSkeleton />)
    const region = container.querySelector('.loading-region')
    expect(region).toHaveAttribute('aria-busy')
  })

  it('skeleton elements are present for shimmer animation targeting', () => {
    const { container } = render(<AttestationsSkeleton />)
    const skeletons = container.querySelectorAll('.skeleton')
    // CSS @media (prefers-reduced-motion) targets .skeleton; confirm presence
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('crossfade-root has data-loaded attribute for CSS transition targeting', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.querySelector('.crossfade-root')
    // CSS selects [data-loaded="true"/"false"] for transitions and reduced-motion
    expect(root).toHaveAttribute('data-loaded')
  })

  it('crossfade-stagger-item class is present for CSS --crossfade-delay computation', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-stagger-item')).toBeInTheDocument()
  })

  it('DashboardSkeleton crossfade mode also receives crossfade-stagger-item class', () => {
    const { container } = render(
      <DashboardSkeleton loaded={false}>
        <div>real</div>
      </DashboardSkeleton>,
    )
    expect(container.querySelector('.crossfade-stagger-item')).toBeInTheDocument()
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('CrossfadeReveal renders correctly with empty string children', () => {
    const { container } = render(
      <CrossfadeReveal loaded={true} skeleton={<span>skel</span>}>
        {''}
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-content-layer')).toBeInTheDocument()
  })

  it('CrossfadeReveal renders correctly with nested fragment as skeleton', () => {
    const { container } = render(
      <CrossfadeReveal
        loaded={false}
        skeleton={
          <>
            <span>part1</span>
            <span>part2</span>
          </>
        }
      >
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-skeleton-layer')).toBeInTheDocument()
  })

  it('CrossfadeReveal renders correctly with null as children (loaded=false)', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        {null}
      </CrossfadeReveal>,
    )
    expect(container.querySelector('.crossfade-root')).toBeInTheDocument()
  })

  it('DashboardSkeleton renders without props (all defaults)', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.querySelector('[role="status"]')).toBeInTheDocument()
  })

  it('AttestationsSkeleton renders without props (all defaults)', () => {
    const { container } = render(<AttestationsSkeleton />)
    expect(container.querySelector('[role="status"]')).toBeInTheDocument()
  })

  it('multiple MetricCardSkeleton instances render independently', () => {
    const { container } = render(
      <div>
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>,
    )
    expect(container.querySelectorAll('.skeleton-metric')).toHaveLength(3)
  })

  it('multiple AttestationRowSkeleton instances render independently', () => {
    const { container } = render(
      <div>
        <AttestationRowSkeleton />
        <AttestationRowSkeleton />
      </div>,
    )
    expect(container.querySelectorAll('.skeleton-row')).toHaveLength(2)
  })
})
