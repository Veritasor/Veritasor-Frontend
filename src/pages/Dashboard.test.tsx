import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

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
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/quick actions/i)
    expect(container.querySelector('section')).toBeInTheDocument()
  })

  it('renders trigger button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /trigger monthly revenue report/i })).toBeInTheDocument()
  })

  it('has muted description text', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('[style*="var(--muted)"]').length).toBeGreaterThan(0)
  })
})
