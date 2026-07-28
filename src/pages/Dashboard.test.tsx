import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

// Mock IntersectionObserver for chart visibility tests
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
      setTimeout(() => cb([{ isIntersecting: true }]), 0)
    }
  })
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(prefers-color-scheme: light)' ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  return render(<MemoryRouter><Dashboard /></MemoryRouter>)
}

describe('Dashboard Page', () => {
  it('renders heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard')
  })

  it('renders quick actions section', () => {
    const { container } = renderPage()
    expect(screen.getByRole('heading', { level: 2, name: /quick actions/i })).toBeInTheDocument()
    expect(container.querySelectorAll('section').length).toBeGreaterThanOrEqual(2)
  })

  it('renders trigger button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /trigger monthly revenue report/i })).toBeInTheDocument()
  })

  it('has muted description text', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('[style*="var(--muted)"]').length).toBeGreaterThan(0)
  })

  // ─── Responsive class structure ──────────────────────────────

  it('renders dashboard-page wrapper', () => {
    const { container } = renderPage()
    expect(container.querySelector('.dashboard-page')).toBeInTheDocument()
  })

  it('renders dashboard-grid container', () => {
    const { container } = renderPage()
    expect(container.querySelector('.dashboard-grid')).toBeInTheDocument()
  })

  it('renders four dashboard-section cards (metrics, actions, bar chart, line chart)', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('.dashboard-section').length).toBe(4)
  })

  it('renders dashboard-metrics-grid', () => {
    const { container } = renderPage()
    expect(container.querySelector('.dashboard-metrics-grid')).toBeInTheDocument()
  })

  it('renders three dashboard-metric-card elements', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('.dashboard-metric-card').length).toBe(3)
  })

  it('renders metric labels, values, and sub-labels', () => {
    const { container } = renderPage()
    expect(container.querySelector('.dashboard-metric-label')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-metric-value')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-metric-sub')).toBeInTheDocument()
  })

  it('renders dashboard-actions-list', () => {
    const { container } = renderPage()
    expect(container.querySelector('.dashboard-actions-list')).toBeInTheDocument()
  })

  // ─── Chart sections ──────────────────────────────────────────

  it('renders Monthly Revenue section', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 2, name: /monthly revenue/i })).toBeInTheDocument()
  })

  it('renders Weekly Trend section', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 2, name: /weekly trend/i })).toBeInTheDocument()
  })

  it('renders bar chart with aria-label', () => {
    renderPage()
    expect(screen.getByRole('img', { name: /bar chart showing monthly revenue/i })).toBeInTheDocument()
  })

  it('renders line chart with aria-label', () => {
    renderPage()
    expect(screen.getByRole('img', { name: /line chart showing weekly revenue trend/i })).toBeInTheDocument()
  })

  it('renders dashboard-chart wrappers', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('.dashboard-chart').length).toBe(2)
  })

  it('renders dashboard-chart-card sections', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('.dashboard-chart-card').length).toBe(2)
  })

  it('bar chart contains SVG elements', () => {
    const { container } = renderPage()
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })

  it('bar chart contains chart-bar class on rects', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('.chart-bar').length).toBe(6)
  })

  it('line chart contains chart-line class on path', () => {
    const { container } = renderPage()
    expect(container.querySelector('.chart-line')).toBeInTheDocument()
  })

  // ─── Link and button accessibility ──────────────────────────

  it('renders connect source link with accessible label', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /open connect source wizard/i })).toBeInTheDocument()
  })

  it('connect source link has correct href', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /open connect source wizard/i })
    expect(link).toHaveAttribute('href', '/connect-source/provider')
  })

  // ─── Modal interaction ──────────────────────────────────────

  it('opens AttestationConfirmModal when trigger button is clicked', async () => {
    renderPage()
    const trigger = screen.getByRole('button', { name: /trigger monthly revenue report/i })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    trigger.click()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('closes modal via onClose', async () => {
    renderPage()
    screen.getByRole('button', { name: /trigger monthly revenue report/i }).click()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    const closeBtn = screen.getByRole('button', { name: /close dialog/i })
    closeBtn.click()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
