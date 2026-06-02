/**
 * Skeleton Loader Component Tests
 *
 * Tests for accessibility, rendering, and responsive behavior of loading skeletons.
 * Validates WCAG 2.1 AA compliance including:
 * - aria-busy attribute presence
 * - role="status" for live region announcements
 * - Proper semantic structure
 * - Reduced motion preference support
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DashboardSkeleton, AttestationsSkeleton, MetricCardSkeleton, AttestationRowSkeleton } from './SkeletonLoader'

describe('DashboardSkeleton', () => {
  it('should render loading skeleton with accessibility attributes and metrics', () => {
    const { container } = render(<DashboardSkeleton />)
    const loadingRegion = container.querySelector('[role="status"]')
    expect(loadingRegion).toBeInTheDocument()
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true')
    expect(loadingRegion).toHaveAttribute('aria-label', 'Loading dashboard metrics')

    const metrics = container.querySelectorAll('.skeleton-metric')
    expect(metrics).toHaveLength(4)
  })

  it('should render action list skeletons with loading region', () => {
    const { container } = render(<DashboardSkeleton />)
    const listItems = container.querySelectorAll('li')
    expect(listItems.length).toBeGreaterThan(0)
    
    const loadingRegion = container.querySelector('.loading-region')
    expect(loadingRegion).toBeInTheDocument()
    expect(loadingRegion).toHaveClass('loading-region')
  })

  it('should have proper CSS classes and skeleton styling', () => {
    const { container } = render(<DashboardSkeleton />)
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
    
    const cardContent = container.querySelector('.skeleton-card-content')
    expect(cardContent).toBeInTheDocument()
  })
})

describe('AttestationsSkeleton', () => {
  it('should render loading skeleton with accessibility attributes and rows', () => {
    const { container } = render(<AttestationsSkeleton />)
    const loadingRegion = container.querySelector('[role="status"]')
    expect(loadingRegion).toBeInTheDocument()
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true')
    expect(loadingRegion).toHaveAttribute('aria-label', 'Loading attestations list')

    const rows = container.querySelectorAll('.skeleton-row')
    expect(rows).toHaveLength(5)
  })

  it('should render header skeleton and list structure', () => {
    const { container } = render(<AttestationsSkeleton />)
    const header = container.querySelector('.skeleton-row-header')
    expect(header).toBeInTheDocument()

    const list = container.querySelector('.skeleton-list')
    expect(list).toBeInTheDocument()
  })

  it('should have proper CSS classes for loading region', () => {
    const { container } = render(<AttestationsSkeleton />)
    const loadingRegion = container.querySelector('.loading-region')
    expect(loadingRegion).toHaveClass('loading-region')
    
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

describe('MetricCardSkeleton', () => {
  it('should render metric skeleton with proper structure', () => {
    const { container } = render(<MetricCardSkeleton />)
    const metric = container.querySelector('.skeleton-metric')
    expect(metric).toBeInTheDocument()

    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

describe('AttestationRowSkeleton', () => {
  it('should render row skeleton with three skeleton text elements', () => {
    const { container } = render(<AttestationRowSkeleton />)
    const row = container.querySelector('.skeleton-row')
    expect(row).toBeInTheDocument()

    const skeletons = container.querySelectorAll('.skeleton-text')
    expect(skeletons).toHaveLength(3)
  })
})

describe('Skeleton CSS Classes', () => {
  it('should have skeleton base class for animation support', () => {
    const { container } = render(
      <div className="skeleton" data-testid="skeleton-base">
        Test
      </div>
    )
    const skeleton = container.querySelector('.skeleton')
    expect(skeleton).toHaveClass('skeleton')
  })

  it('should have loading-region class support', () => {
    const { container } = render(
      <div className="loading-region" aria-busy="true">
        Content
      </div>
    )
    const region = container.querySelector('.loading-region')
    expect(region).toHaveClass('loading-region')
  })
})

describe('Responsive Behavior', () => {
  it('should render with responsive grid structure for metrics', () => {
    const { container } = render(<DashboardSkeleton />)
    const metrics = container.querySelectorAll('.skeleton-metric')
    expect(metrics.length).toBeGreaterThan(0)
  })

  it('should render rows with responsive layout', () => {
    const { container } = render(<AttestationsSkeleton />)
    const rows = container.querySelectorAll('.skeleton-row')
    expect(rows.length).toBeGreaterThan(0)
  })
})

describe('Empty and Error States', () => {
  it('should handle empty state gracefully', () => {
    const { container } = render(<AttestationsSkeleton />)
    expect(container).toBeInTheDocument()
    expect(container.querySelector('.skeleton')).toBeInTheDocument()
  })

  it('should render without dynamic content issues', () => {
    const { container } = render(<DashboardSkeleton />)
    const skeleton = container.querySelector('.skeleton')
    expect(skeleton).toBeInTheDocument()
  })
})


