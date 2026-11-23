import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Attestations, { PAGE_SIZE } from './Attestations'
import { ToastProvider } from '../components/ToastContext'
import { AttestationsProvider, type Attestation } from '../state/attestations'
import { createMockAttestations } from '../state/attestationMocks'

function renderPage(options?: {
  initialEntries?: string[]
  initialAttestations?: Attestation[]
}) {
  return render(
    <AttestationsProvider initialAttestations={options?.initialAttestations}>
      <ToastProvider>
        <MemoryRouter initialEntries={options?.initialEntries}>
          <Attestations />
        </MemoryRouter>
      </ToastProvider>
    </AttestationsProvider>,
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
    const chart = screen.getByRole('figure', { name: /attestation history/i })
    expect(chart).toBeInTheDocument()
    expect(screen.getAllByText(/success/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/failure/i).length).toBeGreaterThan(0)
  })

  it('renders date-axis labels and includes missing days in the trend', () => {
    renderPage()
    const chart = screen.getByRole('region', { name: 'Attestation activity trend' })
    const barGroups = chart.querySelectorAll('[id^="attestation-trend-bar-"]')
    const svgLabels = Array.from(chart.querySelectorAll('svg text'), (label) => label.textContent)
    const firstDateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
      .format(new Date(2026, 4, 15))

    expect(barGroups).toHaveLength(14)
    expect(svgLabels).toContain(firstDateLabel)
  })

  it('exposes tabular data via the "View as table" toggle', () => {
    renderPage()
    const toggle = screen.getByRole('button', { name: /view as table/i })
    expect(toggle).toBeInTheDocument()
    toggle.click()
    expect(screen.getByRole('table', { name: /attestation history/i })).toBeInTheDocument()
  })

  it('supports keyboard navigation on chart data points', () => {
    renderPage()
    const chart = screen.getByRole('figure', { name: /attestation history/i })
    const focusable = chart.querySelectorAll('button, [tabindex], a')
    expect(focusable.length).toBeGreaterThan(0)
    focusable[0].focus()
    expect(focusable[0]).toHaveFocus()
  })

  it('does not update the live region when a bar is hovered', () => {
    renderPage()
    const chart = screen.getByRole('region', { name: 'Attestation activity trend' })
    const status = within(chart).getByRole('status')
    const initialStatus = status.textContent
    const firstBar = chart.querySelector('#attestation-trend-bar-0')

    expect(firstBar).not.toBeNull()
    fireEvent.mouseEnter(firstBar!)
    expect(status).toHaveTextContent(initialStatus!)
  })
})

describe('Attestations Page — pagination and filtering with 2,000 items', () => {
  const largeFixture = createMockAttestations(2000)

  it('renders only one page of rows in the DOM for 2,000 attestations', () => {
    renderPage({ initialAttestations: largeFixture })

    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(PAGE_SIZE)

    const pagination = screen.getByRole('navigation', { name: 'Attestations pagination' })
    expect(within(pagination).getByText('Page 1 of 40')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Next' })).toBeEnabled()

    const links = screen.getAllByRole('link', { name: /view details/i })
    expect(links[0]).toHaveAttribute('href', '/attestations/att-0001')
    expect(links[PAGE_SIZE - 1]).toHaveAttribute('href', '/attestations/att-0050')
  })

  it('respects the URL ?page param and navigates between pages', () => {
    renderPage({
      initialAttestations: largeFixture,
      initialEntries: ['/attestations?page=2'],
    })

    const pagination = screen.getByRole('navigation', { name: 'Attestations pagination' })
    expect(within(pagination).getByText('Page 2 of 40')).toBeInTheDocument()

    const links = screen.getAllByRole('link', { name: /view details/i })
    expect(links).toHaveLength(PAGE_SIZE)
    expect(links[0]).toHaveAttribute('href', '/attestations/att-0051')

    fireEvent.click(within(pagination).getByRole('button', { name: 'Next' }))
    expect(within(pagination).getByText('Page 3 of 40')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /view details/i })[0]).toHaveAttribute(
      'href',
      '/attestations/att-0101',
    )
  })

  it('resets page to 1 when typing in SearchFilter or toggling a status chip', () => {
    renderPage({
      initialAttestations: largeFixture,
      initialEntries: ['/attestations?page=3'],
    })

    const pagination = screen.getByRole('navigation', { name: 'Attestations pagination' })
    expect(within(pagination).getByText('Page 3 of 40')).toBeInTheDocument()

    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'Stripe' } })

    expect(within(pagination).getByText('Page 1 of 10')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(PAGE_SIZE)

    fireEvent.click(within(pagination).getByRole('button', { name: 'Next' }))
    expect(within(pagination).getByText('Page 2 of 10')).toBeInTheDocument()

    const statusGroup = screen.getByRole('group', { name: 'Filter by status' })
    fireEvent.click(within(statusGroup).getByRole('button', { name: 'Verified' }))

    expect(within(pagination).getByText('Page 1 of 4')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(PAGE_SIZE)
  })
})
