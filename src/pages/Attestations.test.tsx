import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Attestations from './Attestations'

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

  it('renders the batch period picker with selected periods', () => {
    renderPage()

    expect(
      screen.getByRole('heading', {
        name: /select periods and run attestations together/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /May 2026/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /April 2026/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /March 2026/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /February 2026/i })).not.toBeChecked()
    expect(screen.getByRole('button', { name: /Trigger 3 periods/i })).toBeEnabled()
  })

  it('shows per-period batch outcomes and partial success counts', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Trigger 3 periods/i }))

    expect(screen.getAllByText('May 2026')).toHaveLength(2)
    expect(screen.getAllByText('April 2026')).toHaveLength(2)
    expect(screen.getAllByText('March 2026')).toHaveLength(2)
    expect(screen.getByText('1 succeeded, 1 queued, 1 failed.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Re-run failed/i })).toBeEnabled()
  })

  it('queues failed batch outcomes when re-running failed periods', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Trigger 3 periods/i }))
    fireEvent.click(screen.getByRole('button', { name: /Re-run failed/i }))

    expect(screen.getByText('1 succeeded, 2 queued, 0 failed.')).toBeInTheDocument()
    expect(screen.getByText(/Re-run queued for the next verifier window/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Re-run failed/i })).toBeDisabled()
  })

  it('disables the batch trigger until at least one period is selected', () => {
    renderPage()

    fireEvent.click(screen.getByRole('checkbox', { name: /May 2026/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /April 2026/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /March 2026/i }))

    expect(screen.getByRole('button', { name: /Trigger 0 periods/i })).toBeDisabled()
    expect(screen.getByText(/Select at least one period/i)).toBeInTheDocument()
  })
})
