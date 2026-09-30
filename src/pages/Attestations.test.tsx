import { expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Attestations from './Attestations'
import { AttestationTrendChart } from './Attestations'

function renderPage() {
  return render(
    <MemoryRouter>
      <Attestations />
    </MemoryRouter>,
  )
}

describe('Attestations Page', () => {
  it('renders heading and description', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Attestations')
    expect(screen.getByText(/merkle roots/i)).toBeInTheDocument()
  })

  it('renders list items with links to detail view', () => {
    renderPage()
    const links = screen.getAllByRole('link', { name: /view details/i })
    expect(links.length).toBeGreaterThanOrEqual(2)
    expect(links[0]).toHaveAttribute('href', '/attestations/att-001')
    expect(links[1]).toHaveAttribute('href', '/attestations/att-002')
  })

  it('shows status badges', () => {
    renderPage()
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
  })

  it('renders a timeline list', () => {
    const { container } = renderPage()
    expect(container.querySelector('ol')).toBeInTheDocument()
    expect(container.querySelectorAll('li').length).toBeGreaterThanOrEqual(2)
  })

  it('has accessible article labels', () => {
    renderPage()
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThanOrEqual(2)
  })

  it('renders a chart with success and failure trends', () => {
    renderPage()
    const chart = screen.getByRole('img', { name: /attestation activity over time/i })
    expect(chart).toBeInTheDocument()
    expect(screen.getAllByText(/verified/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0)
  })

  it('exposes tabular data via the "View as table" toggle', () => {
    renderPage()
    const toggle = screen.getByRole('button', { name: /view as table/i })
    expect(toggle).toBeInTheDocument()
    act(() => {
      toggle.click()
    })
    const table = screen.queryByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('supports keyboard navigation on chart data points', () => {
    renderPage()
    const chart = screen.getByRole('img', { name: /attestation activity over time/i })
    const focusable = chart.parentElement?.querySelectorAll('[tabindex]')
    expect(focusable).toBeDefined()
    expect(focusable?.length).toBeGreaterThan(0)
    if (focusable && focusable[0]) {
      act(() => {
        (focusable[0] as HTMLElement).focus()
      })
      expect(focusable[0]).toHaveFocus()
    }
  })
})

describe('AttestationTrendChart', () => {
  it('renders empty state when no attestations are provided', () => {
    render(
      <MemoryRouter>
        <AttestationTrendChart attestations={[]} />
      </MemoryRouter>
    )
    expect(screen.getByText(/no attestation history is available to chart/i)).toBeInTheDocument()
  })

  it('renders chart with single attestation', () => {
    const attestations = [
      {
        id: 'att-001',
        status: 'verified' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
      },
    ]
    const { container } = render(
      <MemoryRouter>
        <AttestationTrendChart attestations={attestations} />
      </MemoryRouter>
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /attestation activity over time/i })).toBeInTheDocument()
  })

  it('handles bucket with zero count for a status (failure path)', () => {
    const attestations = [
      {
        id: 'att-001',
        status: 'verified' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
      },
    ]
    const { container } = render(
      <MemoryRouter>
        <AttestationTrendChart attestations={attestations} />
      </MemoryRouter>
    )
    const rects = container.querySelectorAll('svg rect')
    const failedRects = Array.from(rects as NodeListOf<Element>).filter((rect) => 
      rect.querySelector('title')?.textContent?.includes('Failed')
    )
    expect(failedRects.length).toBe(0)
  })

  it('renders all status segments when counts are non-zero', () => {
    const attestations = [
      {
        id: 'att-001',
        status: 'verified' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
      },
      {
        id: 'att-002',
        status: 'pending' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x9f8e7d6c5b4a3928170605040302010f0e0d0c0b0a090807060504030201000f',
      },
      {
        id: 'att-003',
        status: 'failed' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
      },
    ]
    const { container } = render(
      <MemoryRouter>
        <AttestationTrendChart attestations={attestations} />
      </MemoryRouter>
    )
    const rects = container.querySelectorAll('svg rect')
    expect(rects.length).toBeGreaterThan(0)
    
    const verifiedRects = Array.from(rects as NodeListOf<Element>).filter((rect) => 
      rect.querySelector('title')?.textContent?.includes('Verified')
    )
    const pendingRects = Array.from(rects as NodeListOf<Element>).filter((rect) => 
      rect.querySelector('title')?.textContent?.includes('Pending')
    )
    const failedRects = Array.from(rects as NodeListOf<Element>).filter((rect) => 
      rect.querySelector('title')?.textContent?.includes('Failed')
    )
    
    expect(verifiedRects.length).toBeGreaterThan(0)
    expect(pendingRects.length).toBeGreaterThan(0)
    expect(failedRects.length).toBeGreaterThan(0)
  })

  it('handles mixed zero and non-zero counts across statuses', () => {
    const attestations = [
      {
        id: 'att-001',
        status: 'verified' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
      },
      {
        id: 'att-002',
        status: 'verified' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x9f8e7d6c5b4a3928170605040302010f0e0d0c0b0a090807060504030201000f',
      },
    ]
    const { container } = render(
      <MemoryRouter>
        <AttestationTrendChart attestations={attestations} />
      </MemoryRouter>
    )
    const rects = container.querySelectorAll('svg rect')
    
    const verifiedRects = Array.from(rects as NodeListOf<Element>).filter((rect) => 
      rect.querySelector('title')?.textContent?.includes('Verified')
    )
    const pendingRects = Array.from(rects as NodeListOf<Element>).filter((rect) => 
      rect.querySelector('title')?.textContent?.includes('Pending')
    )
    const failedRects = Array.from(rects as NodeListOf<Element>).filter((rect) => 
      rect.querySelector('title')?.textContent?.includes('Failed')
    )
    
    expect(verifiedRects.length).toBeGreaterThan(0)
    expect(pendingRects.length).toBe(0)
    expect(failedRects.length).toBe(0)
  })

  it('handles boundary case with single bucket', () => {
    const attestations = [
      {
        id: 'att-001',
        status: 'verified' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
      },
    ]
    const { container } = render(
      <MemoryRouter>
        <AttestationTrendChart attestations={attestations} />
      </MemoryRouter>
    )
    const rects = container.querySelectorAll('svg rect')
    expect(rects.length).toBeGreaterThan(0)
  })

  it('handles boundary case with multiple buckets', () => {
    const attestations = [
      {
        id: 'att-001',
        status: 'verified' as const,
        createdAt: '2026-05-28T14:32:00Z',
        merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
      },
      {
        id: 'att-002',
        status: 'pending' as const,
        createdAt: '2026-05-29T14:32:00Z',
        merkleRoot: '0x9f8e7d6c5b4a3928170605040302010f0e0d0c0b0a090807060504030201000f',
      },
    ]
    const { container } = render(
      <MemoryRouter>
        <AttestationTrendChart attestations={attestations} />
      </MemoryRouter>
    )
    const rects = container.querySelectorAll('svg rect')
    expect(rects.length).toBeGreaterThan(0)
  })
})
