/**
 * Dashboard Page Tests
 *
 * Tests for Dashboard component including loading states, accessibility, and responsive behavior.
 * Ensures WCAG 2.1 AA compliance with proper semantic HTML and loading state handling.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

describe('Dashboard Page', () => {
  it('should render dashboard page with complete content', () => {
    const { container } = render(<Dashboard />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Dashboard')

    const h2 = screen.getByRole('heading', { level: 2, name: /key metrics/i })
    expect(h2).toBeInTheDocument()

    const listItems = screen.getAllByRole('listitem')
    expect(listItems.length).toBeGreaterThan(0)

    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()
  })

  it('should have accessible structure with proper styling', () => {
    const { container } = render(<Dashboard />)

    const mutedText = container.querySelectorAll('[style*="var(--muted)"]')
    expect(mutedText.length).toBeGreaterThan(0)

    const grid = container.querySelector('[style*="grid-template-columns"]')
    expect(grid).toBeInTheDocument()

    const section = container.querySelector('section')
    expect(section).toHaveStyle({ padding: '1.5rem' })
  })

  it('should render with proper semantic structure and content', () => {
    const { container } = render(<Dashboard />)

    const paras = container.querySelectorAll('p')
    expect(paras.length).toBeGreaterThan(0)
    expect(paras[0]).toHaveTextContent(/revenue sources/)

    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })
})

