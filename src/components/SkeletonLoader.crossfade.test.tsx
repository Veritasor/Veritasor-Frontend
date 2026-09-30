/**
 * SkeletonLoader — CrossfadeReveal / DashboardSkeletonProps behavior fixture
 *
 * `SkeletonLoader.test.tsx` already pins the static markup of these components
 * (attributes, classes, one-way `false -> true` transition). This file is the
 * dedicated behavior fixture requested by the tracking issue and deliberately
 * targets what that suite cannot see, because every case below fails if the
 * corresponding production branch regresses:
 *
 *  1. Reverse state transition (`true -> false`, the refetch/reload path) — the
 *     existing suite only ever goes `false -> true`.
 *  2. Accessibility-tree reachability rather than raw attributes. The existing
 *     suite asserts `aria-hidden` is *present*; it never asserts the layer is
 *     actually removed from the AT tree, and — crucially — never asserts the
 *     content actually *becomes* reachable once `loaded` flips.
 *  3. `staggerIndex` -> `--crossfade-index` unitless contract, custom-property
 *     merge precedence, per-item independence across re-renders.
 *  4. Boundary inputs: negative / non-finite `staggerIndex`, empty `className`,
 *     `null` vs `undefined` skeleton/children.
 *  5. `DashboardSkeletonProps` definedness guard: the crossfade branch keys off
 *     `!== undefined`, not truthiness, so `null`/`0` children still crossfade.
 *  6. The full skeleton structure *inside* crossfade mode, which the existing
 *     crossfade tests never inspect (they stop at `.crossfade-root` existing),
 *     plus the loose standalone matchers (`>= 3`, `> 0`) tightened to exact
 *     counts.
 */

import type { CSSProperties } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrossfadeReveal, DashboardSkeleton, AttestationsSkeleton } from './SkeletonLoader'

const crossfadeOf = (container: HTMLElement) => container.querySelector('.crossfade-root')!

const skeletonLayer = (container: HTMLElement) =>
  container.querySelector('[data-testid="crossfade-skeleton"]')!

const contentLayer = (container: HTMLElement) =>
  container.querySelector('[data-testid="crossfade-content"]')!

// ─── 1. Primary state transitions ─────────────────────────────────────────────
// The existing suite proves `false -> true`. Loading a dashboard is not a
// one-way trip: a refetch flips `loaded` back to `false`, and every
// attribute-based assertion in the existing suite is blind to that path.

describe('CrossfadeReveal — state transition contract', () => {
  it('restores the pre-load state when loaded flips true -> false (refetch path)', () => {
    const skeleton = <div role="status" aria-busy="true">Loading…</div>
    const { container, rerender } = render(
      <CrossfadeReveal loaded={true} skeleton={skeleton}>
        <span>content</span>
      </CrossfadeReveal>,
    )

    // Loaded: skeleton is the inactive layer.
    expect(crossfadeOf(container)).toHaveAttribute('data-loaded', 'true')
    expect(skeletonLayer(container)).toHaveAttribute('aria-hidden', 'true')
    expect(contentLayer(container)).not.toHaveAttribute('aria-hidden')

    rerender(
      <CrossfadeReveal loaded={false} skeleton={skeleton}>
        <span>content</span>
      </CrossfadeReveal>,
    )

    // Loading again: the roles of the two layers must swap back exactly.
    expect(crossfadeOf(container)).toHaveAttribute('data-loaded', 'false')
    expect(skeletonLayer(container)).not.toHaveAttribute('aria-hidden')
    expect(contentLayer(container)).toHaveAttribute('aria-hidden', 'true')
  })

  it('survives repeated false -> true -> false -> true round trips without attribute drift', () => {
    const { container, rerender } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const expected: Array<[string, string | null, string | null]> = [
      ['false', null, 'true'],
      ['true', 'true', null],
      ['false', null, 'true'],
      ['true', 'true', null],
    ]

    for (const [loaded, skelHidden, contentHidden] of expected) {
      rerender(
        <CrossfadeReveal loaded={loaded === 'true'} skeleton={<span>skel</span>}>
          <span>content</span>
        </CrossfadeReveal>,
      )
      expect(crossfadeOf(container)).toHaveAttribute('data-loaded', loaded)
      expect(skeletonLayer(container).getAttribute('aria-hidden')).toBe(skelHidden)
      expect(contentLayer(container).getAttribute('aria-hidden')).toBe(contentHidden)
    }
  })

  it('keeps both layers mounted across the transition (no remount on either swap)', () => {
    const { container, rerender } = render(
      <CrossfadeReveal loaded={false} skeleton={<span data-testid="skel-node">skel</span>}>
        <span data-testid="content-node">content</span>
      </CrossfadeReveal>,
    )
    const skeletonNodeBefore = screen.getByTestId('skel-node')
    const contentNodeBefore = screen.getByTestId('content-node')

    rerender(
      <CrossfadeReveal loaded={true} skeleton={<span data-testid="skel-node">skel</span>}>
        <span data-testid="content-node">content</span>
      </CrossfadeReveal>,
    )

    // Same DOM nodes: the crossfade is a CSS opacity swap, not a mount swap.
    expect(screen.getByTestId('skel-node')).toBe(skeletonNodeBefore)
    expect(screen.getByTestId('content-node')).toBe(contentNodeBefore)
    expect(container.querySelectorAll('[data-testid="crossfade-skeleton"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-testid="crossfade-content"]')).toHaveLength(1)
  })
})

// ─── 2. Accessibility tree, not just attributes ───────────────────────────────
// `toHaveAttribute('aria-hidden', 'true')` passes even if the element is never
// actually removed from the accessibility tree. These cases assert the *effect*:
// which nodes assistive technology can reach in each state.

describe('CrossfadeReveal — accessibility-tree reachability', () => {
  it('exposes the skeleton live region to AT while loading', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<div role="status" aria-busy="true">Loading…</div>}>
        <section role="region" aria-label="Dashboard">data</section>
      </CrossfadeReveal>,
    )

    const status = screen.getAllByRole('status')
    expect(status).toHaveLength(1)
    expect(status[0]).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-testid="crossfade-skeleton"]')).toContainElement(status[0])
    // The real content is hidden until loading completes.
    expect(screen.queryByRole('region', { name: 'Dashboard' })).toBeNull()
  })

  it('removes the skeleton live region from the AT tree once loaded, without unmounting it', () => {
    const { container } = render(
      <CrossfadeReveal loaded={true} skeleton={<div role="status" aria-busy="true">Loading…</div>}>
        <section role="region" aria-label="Dashboard">data</section>
      </CrossfadeReveal>,
    )

    // Gone from the accessibility tree…
    expect(screen.queryAllByRole('status')).toHaveLength(0)
    // …but still in the DOM, so the CSS fade-out can animate it.
    const rawStatus = container.querySelector('[data-testid="crossfade-skeleton"] [role="status"]')
    expect(rawStatus).not.toBeNull()
    expect(skeletonLayer(container)).toHaveAttribute('aria-hidden', 'true')
  })

  it('reveals the real content to AT only after loaded becomes true', () => {
    const { rerender } = render(
      <CrossfadeReveal loaded={false} skeleton={<div role="status">Loading…</div>}>
        <section role="region" aria-label="Dashboard">data</section>
      </CrossfadeReveal>,
    )
    expect(screen.queryByRole('region', { name: 'Dashboard' })).toBeNull()

    rerender(
      <CrossfadeReveal loaded={true} skeleton={<div role="status">Loading…</div>}>
        <section role="region" aria-label="Dashboard">data</section>
      </CrossfadeReveal>,
    )

    expect(screen.getByRole('region', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryAllByRole('status')).toHaveLength(0)
  })

  it('never leaves the loading region duplicated in the AT tree', () => {
    // DashboardSkeleton supplies its own role="status" region; wrapping it must
    // not add a second one, and it must vanish exactly once when loaded.
    const { rerender } = render(
      <DashboardSkeleton loaded={false}>
        <div>real</div>
      </DashboardSkeleton>,
    )
    expect(screen.getAllByRole('status')).toHaveLength(1)

    rerender(
      <DashboardSkeleton loaded={true}>
        <div>real</div>
      </DashboardSkeleton>,
    )
    expect(screen.queryAllByRole('status')).toHaveLength(0)
  })
})

// ─── 3. staggerIndex -> CSS custom property contract ──────────────────────────
// index.css computes `--crossfade-delay: calc(var(--crossfade-index) * 40ms)`.
// calc() only resolves if the index is a *unitless* number, yet nothing in the
// existing suite asserts the raw serialised value can never carry a `px` suffix.

describe('CrossfadeReveal — staggerIndex / CSS custom property contract', () => {
  it.each([0, 1, 12])('emits --crossfade-index as a unitless number (%i)', (index) => {
    const { container } = render(
      <CrossfadeReveal loaded={false} staggerIndex={index} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )

    const root = crossfadeOf(container) as HTMLElement
    expect(root.style.getPropertyValue('--crossfade-index')).toBe(String(index))
    // A `px` suffix here would make the calc() invalid and silently kill the stagger.
    expect(root.getAttribute('style')).not.toContain('px')
  })

  it('always emits --crossfade-index even when style is omitted or empty', () => {
    const omitted = render(
      <CrossfadeReveal loaded={false} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(
      (omitted.container.firstChild as HTMLElement).style.getPropertyValue('--crossfade-index'),
    ).toBe('0')
    omitted.unmount()

    const empty = render(
      <CrossfadeReveal loaded={false} style={{}} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    expect(
      (empty.container.firstChild as HTMLElement).style.getPropertyValue('--crossfade-index'),
    ).toBe('0')
  })

  it('lets a caller-supplied style custom property override staggerIndex (documented merge order)', () => {
    const { container } = render(
      <CrossfadeReveal
        loaded={false}
        staggerIndex={3}
        style={{ '--crossfade-index': 9 } as CSSProperties}
        skeleton={<span>skel</span>}
      >
        <span>content</span>
      </CrossfadeReveal>,
    )

    expect(
      (container.firstChild as HTMLElement).style.getPropertyValue('--crossfade-index'),
    ).toBe('9')
  })

  it('merges plain style keys alongside the custom property', () => {
    const { container } = render(
      <CrossfadeReveal
        loaded={false}
        staggerIndex={4}
        style={{ marginTop: '2rem' }}
        skeleton={<span>skel</span>}
      >
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.style.getPropertyValue('--crossfade-index')).toBe('4')
    expect(root.style.marginTop).toBe('2rem')
  })

  it('keeps each list item index independent and updates it on re-render', () => {
    const items = ['a', 'b', 'c']
    const list = (offset: number) => (
      <div>
        {items.map((item, idx) => (
          <CrossfadeReveal
            key={item}
            loaded={false}
            staggerIndex={idx + offset}
            skeleton={<span>skel</span>}
          >
            <span>{item}</span>
          </CrossfadeReveal>
        ))}
      </div>
    )

    const { container, rerender } = render(list(0))
    const indices = () =>
      [...container.querySelectorAll('.crossfade-root')].map((root) =>
        (root as HTMLElement).style.getPropertyValue('--crossfade-index'),
      )

    expect(indices()).toEqual(['0', '1', '2'])

    // Re-render with shifted indices: a stale/shared-state regression shows up here.
    rerender(list(5))
    expect(indices()).toEqual(['5', '6', '7'])
  })
})

// ─── 4. Boundary / invalid inputs ─────────────────────────────────────────────
// The component performs no runtime validation, so the contract is "emit the
// caller's value verbatim and never throw". Pinning that keeps the behaviour
// deterministic and documents the one sharp edge: a negative index yields a
// negative `--crossfade-delay`, which shortens (or skips) the fade.

describe('CrossfadeReveal — boundary and invalid inputs', () => {
  it('renders an out-of-range negative staggerIndex verbatim without throwing', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} staggerIndex={-1} skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.style.getPropertyValue('--crossfade-index')).toBe('-1')
    // Boundary observation: index.css turns this into calc(-1 * 40ms) → -40ms
    // transition-delay. Not clamped, by design — see PR notes.
  })

  it('renders non-finite staggerIndex values verbatim without throwing', () => {
    for (const [label, value] of [
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
    ] as const) {
      const { container, unmount } = render(
        <CrossfadeReveal loaded={false} staggerIndex={value} skeleton={<span>skel</span>}>
          <span>content</span>
        </CrossfadeReveal>,
      )
      const root = container.firstChild as HTMLElement
      expect(`${label}:${root.style.getPropertyValue('--crossfade-index')}`).toBe(`${label}:${label}`)
      // Layout classes must be unaffected by a junk index.
      expect(root).toHaveClass('crossfade-root')
      expect(root).toHaveClass('crossfade-stagger-item')
      unmount()
    }
  })

  it('treats className="" as no extra class', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} className="" skeleton={<span>skel</span>}>
        <span>content</span>
      </CrossfadeReveal>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toBe('crossfade-root crossfade-stagger-item')
    expect(root.className).not.toContain('  ')
  })

  it('still renders both layers when skeleton and children are null', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={null}>
        {null}
      </CrossfadeReveal>,
    )
    expect(skeletonLayer(container)).toBeInTheDocument()
    expect(contentLayer(container)).toBeInTheDocument()
    expect(contentLayer(container)).toBeEmptyDOMElement()
  })

  it('places skeleton and children in their own layers (no cross-contamination)', () => {
    const { container } = render(
      <CrossfadeReveal
        loaded={false}
        skeleton={<span data-testid="skel-node">skel</span>}
        className="custom"
        style={{ marginTop: '3rem' }}
      >
        <span data-testid="content-node">content</span>
      </CrossfadeReveal>,
    )

    expect(
      skeletonLayer(container).querySelector('[data-testid="skel-node"]'),
    ).not.toBeNull()
    expect(
      contentLayer(container).querySelector('[data-testid="content-node"]'),
    ).not.toBeNull()
    expect(skeletonLayer(container).querySelector('[data-testid="content-node"]')).toBeNull()
    expect(contentLayer(container).querySelector('[data-testid="skel-node"]')).toBeNull()

    // className / style stay on the root and are not smeared onto the layers.
    expect(skeletonLayer(container)).not.toHaveClass('custom')
    expect(contentLayer(container)).not.toHaveClass('custom')
    expect((skeletonLayer(container) as HTMLElement).style.marginTop).toBe('')
  })

  it('keeps nested CrossfadeReveal instances state-independent', () => {
    const { container } = render(
      <CrossfadeReveal loaded={false} skeleton={<span>outer-skel</span>}>
        <CrossfadeReveal loaded={true} skeleton={<span>inner-skel</span>}>
          <span>inner-content</span>
        </CrossfadeReveal>
      </CrossfadeReveal>,
    )

    const roots = container.querySelectorAll('.crossfade-root')
    expect(roots).toHaveLength(2)
    expect(roots[0]).toHaveAttribute('data-loaded', 'false')
    expect(roots[1]).toHaveAttribute('data-loaded', 'true')
  })
})

// ─── 5. DashboardSkeletonProps definedness guard ──────────────────────────────
// The crossfade branch is `loaded !== undefined && children !== undefined`.
// A truthiness refactor (`loaded && children`) would silently drop crossfade for
// falsy-but-defined children; these cases fail loudly if that happens.

describe('DashboardSkeletonProps — crossfade branch boundaries', () => {
  it('crossfades when children is explicitly null (defined, not truthy)', () => {
    const { container } = render(<DashboardSkeleton loaded={false}>{null}</DashboardSkeleton>)
    expect(container.querySelector('.crossfade-root')).toBeInTheDocument()
    expect(contentLayer(container)).toBeEmptyDOMElement()
  })

  it('crossfades when children is the falsy-but-defined value 0', () => {
    const { container } = render(<DashboardSkeleton loaded={false}>{0}</DashboardSkeleton>)
    expect(container.querySelector('.crossfade-root')).toBeInTheDocument()
    expect(contentLayer(container)).toHaveTextContent('0')
  })

  it('falls back to the standalone skeleton when loaded is true but children is undefined', () => {
    const { container } = render(<DashboardSkeleton loaded={true} />)
    expect(container.querySelector('.crossfade-root')).not.toBeInTheDocument()
    expect(container.querySelector('[role="status"]')).toBeInTheDocument()
  })

  it('falls back to the standalone skeleton when neither prop is supplied', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.querySelector('.crossfade-root')).not.toBeInTheDocument()
    expect(container.querySelector('.loading-region')).toBeInTheDocument()
  })

  it('behaves the same way for AttestationsSkeleton', () => {
    const nullChildren = render(<AttestationsSkeleton loaded={false}>{null}</AttestationsSkeleton>)
    expect(nullChildren.container.querySelector('.crossfade-root')).toBeInTheDocument()
    nullChildren.unmount()

    const noChildren = render(<AttestationsSkeleton loaded={true} />)
    expect(noChildren.container.querySelector('.crossfade-root')).not.toBeInTheDocument()
    expect(noChildren.container.querySelector('[role="status"]')).toBeInTheDocument()
  })
})

// ─── 6. Full skeleton structure inside crossfade mode ─────────────────────────
// The existing crossfade tests stop at `.crossfade-root` existing, and the
// standalone structural tests use loose matchers (`>= 3`, `> 0`). These cases
// assert the exact skeleton density in BOTH states, so a collapsed or
// over-rendered skeleton in crossfade mode can no longer pass.

describe('crossfade mode preserves the complete skeleton structure', () => {
  it('DashboardSkeleton renders all 4 metrics / 3 actions / 13 shimmer nodes in both states', () => {
    for (const loaded of [false, true]) {
      const { container, unmount } = render(
        <DashboardSkeleton loaded={loaded}>
          <div data-testid="real-dashboard">Real</div>
        </DashboardSkeleton>,
      )
      const layer = skeletonLayer(container)

      expect(layer.querySelectorAll('.skeleton-metric')).toHaveLength(4)
      expect(layer.querySelectorAll('li')).toHaveLength(3)
      expect(layer.querySelectorAll('.skeleton')).toHaveLength(13)
      expect(layer.querySelector('.skeleton-card-content')).toBeInTheDocument()
      expect(layer.querySelector('[role="status"]')).toHaveAttribute(
        'aria-label',
        'Loading dashboard metrics',
      )
      // The real content lives only in the content layer.
      expect(layer.querySelector('[data-testid="real-dashboard"]')).toBeNull()
      expect(contentLayer(container).querySelector('[data-testid="real-dashboard"]')).not.toBeNull()
      unmount()
    }
  })

  it('AttestationsSkeleton renders all 5 rows / 3 headers / 19 shimmer nodes in both states', () => {
    for (const loaded of [false, true]) {
      const { container, unmount } = render(
        <AttestationsSkeleton loaded={loaded}>
          <div data-testid="real-list">Real</div>
        </AttestationsSkeleton>,
      )
      const layer = skeletonLayer(container)

      expect(layer.querySelectorAll('.skeleton-row')).toHaveLength(5)
      expect(layer.querySelectorAll('.skeleton-row-header .skeleton-text-short')).toHaveLength(3)
      expect(layer.querySelectorAll('.skeleton')).toHaveLength(19)
      expect(layer.querySelector('.skeleton-list')).toBeInTheDocument()
      expect(layer.querySelector('[role="status"]')).toHaveAttribute(
        'aria-label',
        'Loading attestations list',
      )
      unmount()
    }
  })

  it('attaches the stagger marker to the page-level wrapper too', () => {
    // The CSS contract test in the existing suite only covers DashboardSkeleton.
    const { container } = render(
      <AttestationsSkeleton loaded={false}>
        <div>real</div>
      </AttestationsSkeleton>,
    )
    const root = crossfadeOf(container) as HTMLElement
    expect(root).toHaveClass('crossfade-stagger-item')
    expect(root.style.getPropertyValue('--crossfade-index')).toBe('0')
  })

  it('orders the skeleton layer before the content layer for grid stacking / reading order', () => {
    const { container } = render(
      <DashboardSkeleton loaded={false}>
        <div>real</div>
      </DashboardSkeleton>,
    )
    const children = [...crossfadeOf(container).children]
    expect(children.map((node) => node.className)).toEqual([
      'crossfade-skeleton-layer',
      'crossfade-content-layer',
    ])
  })
})
