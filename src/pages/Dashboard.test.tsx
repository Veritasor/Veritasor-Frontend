import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Dashboard from './Dashboard'

afterEach(() => cleanup())

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard Page', () => {
  it('renders the h1 heading', () => {
    renderDashboard()
    expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument()
  })

  it('renders the Quick actions section heading', () => {
    renderDashboard()
    expect(screen.getByRole('heading', { level: 2, name: /quick actions/i })).toBeInTheDocument()
  })

  it('renders description text mentioning revenue sources', () => {
    renderDashboard()
    expect(screen.getByText(/revenue sources/i)).toBeInTheDocument()
  })

  it('renders the connect-source link in the actions list', () => {
    renderDashboard()
    const link = screen.getByRole('link', { name: /open connect source wizard/i })
    expect(link).toHaveAttribute('href', '/connect-source/provider')
  })

  it('renders the trigger monthly revenue report button', () => {
    renderDashboard()
    expect(
      screen.getByRole('button', { name: /trigger monthly revenue report/i }),
    ).toBeInTheDocument()
  })

  it('renders a section container', () => {
    const { container } = renderDashboard()
    expect(container.querySelector('section')).toBeInTheDocument()
  })

  it('renders muted-colour text elements', () => {
    const { container } = renderDashboard()
    expect(container.querySelectorAll('[style*="var(--muted)"]').length).toBeGreaterThan(0)
  })
})
