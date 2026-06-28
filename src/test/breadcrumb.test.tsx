import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from '../components/Breadcrumb'

function renderBreadcrumb(props: React.ComponentProps<typeof Breadcrumb>) {
  return render(
    <MemoryRouter>
      <Breadcrumb {...props} />
    </MemoryRouter>
  )
}

describe('Breadcrumb', () => {
  it('renders a nav landmark with label "Breadcrumb"', () => {
    renderBreadcrumb({ items: [{ label: 'Home', href: '/' }, { label: 'Detail' }] })
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })

  it('renders ancestor crumbs as links', () => {
    renderBreadcrumb({ items: [{ label: 'Attestations', href: '/attestations' }, { label: 'att-001' }] })
    expect(screen.getByRole('link', { name: 'Attestations' })).toHaveAttribute('href', '/attestations')
  })

  it('renders the last crumb as aria-current="page" and not a link', () => {
    renderBreadcrumb({ items: [{ label: 'Attestations', href: '/attestations' }, { label: 'att-001' }] })
    const current = screen.getByText('att-001')
    expect(current.tagName).toBe('SPAN')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'att-001' })).not.toBeInTheDocument()
  })

  it('renders separators between crumbs', () => {
    renderBreadcrumb({ items: [{ label: 'A', href: '/a' }, { label: 'B', href: '/b' }, { label: 'C' }] })
    const separators = document.querySelectorAll('.breadcrumb-separator')
    // 3 items → 2 separators (before items 2 and 3)
    expect(separators).toHaveLength(2)
  })

  it('truncates labels exceeding maxLabelLength', () => {
    const longLabel = 'Document upload and verification'
    renderBreadcrumb({ items: [{ label: longLabel }], maxLabelLength: 24 })
    // slice(0, 23) + '…' = "Document upload and ver…"
    expect(screen.getByText('Document upload and ver…')).toBeInTheDocument()
  })

  it('does not truncate labels within maxLabelLength', () => {
    renderBreadcrumb({ items: [{ label: 'Business details' }], maxLabelLength: 24 })
    expect(screen.getByText('Business details')).toBeInTheDocument()
  })

  it('adds title attribute to truncated crumbs', () => {
    const longLabel = 'A very long label that exceeds the limit'
    renderBreadcrumb({ items: [{ label: longLabel }], maxLabelLength: 20 })
    const el = screen.getByTitle(longLabel)
    expect(el).toBeInTheDocument()
  })

  it('does not add title attribute when label fits within limit', () => {
    renderBreadcrumb({ items: [{ label: 'Short label' }], maxLabelLength: 24 })
    expect(document.querySelector('[title]')).toBeNull()
  })

  it('renders a single crumb as aria-current="page" with no link', () => {
    renderBreadcrumb({ items: [{ label: 'Only' }] })
    const el = screen.getByText('Only')
    expect(el).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders a crumb without href as a span even when not last', () => {
    // Middle crumb with no href should not be a link
    renderBreadcrumb({ items: [{ label: 'Home' }, { label: 'Middle' }, { label: 'Current' }] })
    // 'Home' has no href — should be a span (not a link)
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(screen.getByText('Home').tagName).toBe('SPAN')
  })

  it('uses default maxLabelLength of 24 when not provided', () => {
    // Exactly 24 chars — should not truncate
    const label = 'A'.repeat(24)
    renderBreadcrumb({ items: [{ label }] })
    expect(screen.getByText(label)).toBeInTheDocument()

    // 25 chars — should truncate
    const longLabel = 'A'.repeat(25)
    const { unmount } = renderBreadcrumb({ items: [{ label: longLabel }] })
    expect(screen.getByText('A'.repeat(23) + '…')).toBeInTheDocument()
    unmount()
  })
})
