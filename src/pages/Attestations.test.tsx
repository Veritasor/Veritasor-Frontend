import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Attestations from './Attestations'

afterEach(() => cleanup())

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/attestations${search ? `?${search}` : ''}`]}>
      <Routes>
        <Route path="/attestations" element={<Attestations />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── Page structure ──────────────────────────────────────────────────────────

describe('Attestations page — structure', () => {
  it('renders the h1 heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: /attestations/i })).toBeInTheDocument()
  })

  it('renders the description mentioning merkle roots', () => {
    renderPage()
    expect(screen.getByText(/merkle roots/i)).toBeInTheDocument()
  })

  it('renders the SearchFilter component (search input present)', () => {
    renderPage()
    expect(
      screen.getByRole('searchbox', { name: /search by merkle root or id/i }),
    ).toBeInTheDocument()
  })

  it('renders all status filter chips', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verified' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Failed' })).toBeInTheDocument()
  })
})

// ─── Mock data rendering ──────────────────────────────────────────────────────

describe('Attestations page — mock data', () => {
  it('renders all 6 attestation timeline cards by default', () => {
    renderPage()
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBe(6)
  })

  it('renders "View details" links for each attestation', () => {
    renderPage()
    const links = screen.getAllByRole('link', { name: /view proof details/i })
    expect(links.length).toBe(6)
  })

  it('first link points to att-001 detail page', () => {
    renderPage()
    const links = screen.getAllByRole('link', { name: /view proof details for attestation att-001/i })
    expect(links[0]).toHaveAttribute('href', '/attestations/att-001')
  })

  it('renders Verified status badges', () => {
    renderPage()
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(3)
  })

  it('renders Pending status badges', () => {
    renderPage()
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2)
  })

  it('renders Failed status badge', () => {
    renderPage()
    expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(1)
  })

  it('displays truncated Merkle root for att-001', () => {
    renderPage()
    expect(screen.getByText(/0x3a7bd3e236/)).toBeInTheDocument()
  })

  it('shows result count in aria-live region', () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 6 attestations')
  })
})

// ─── SearchFilter integration ─────────────────────────────────────────────────

describe('Attestations page — text search filter', () => {
  it('filters by attestation ID prefix', () => {
    renderPage()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'att-001' } })
    expect(screen.getAllByRole('article').length).toBe(1)
  })

  it('filters by merkle root substring', () => {
    renderPage()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '0x3a7b' } })
    expect(screen.getAllByRole('article').length).toBe(1)
  })

  it('shows no-results state when query matches nothing', () => {
    renderPage()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzznomatch' } })
    expect(screen.queryAllByRole('article').length).toBe(0)
    expect(screen.getByText(/no attestations match/i)).toBeInTheDocument()
  })

  it('search is case-insensitive', () => {
    renderPage()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ATT-001' } })
    expect(screen.getAllByRole('article').length).toBe(1)
  })

  it('updates result count announcement as user types', () => {
    renderPage()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'att-001' } })
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 6 attestations')
  })
})

// ─── Chip filter integration ──────────────────────────────────────────────────

describe('Attestations page — status chip filter', () => {
  it('filters to only verified attestations when Verified chip is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Verified' }))
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBe(3)
  })

  it('filters to only pending attestations when Pending chip is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBe(2)
  })

  it('filters to only failed attestations when Failed chip is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBe(1)
  })

  it('combines two status chips (verified + pending)', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Verified' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))
    expect(screen.getAllByRole('article').length).toBe(5)
  })

  it('restores all results when All chip is clicked after filtering', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getAllByRole('article').length).toBe(6)
  })

  it('initialises from URL ?status param', () => {
    renderPage('status=failed')
    expect(screen.getAllByRole('article').length).toBe(1)
    expect(screen.getByRole('button', { name: 'Failed' })).toHaveAttribute('aria-pressed', 'true')
  })
})

// ─── No-results state ─────────────────────────────────────────────────────────

describe('Attestations page — no-results state', () => {
  it('shows the no-results section when filters produce no matches', () => {
    renderPage('status=failed&q=att-001')
    expect(screen.getByRole('region', { name: /no matching attestations/i })).toBeInTheDocument()
  })

  it('hides the timeline when no results', () => {
    renderPage('q=zzznomatch')
    expect(screen.queryByRole('region', { name: /attestation history/i })).not.toBeInTheDocument()
  })

  it('Clear all filters button in no-results state restores the timeline', () => {
    renderPage()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzznomatch' } })
    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }))
    expect(screen.getAllByRole('article').length).toBe(6)
  })
})

// ─── Date range filter (URL-initialised) ─────────────────────────────────────

describe('Attestations page — date range filter', () => {
  it('filters to attestations within the date range from URL params', () => {
    // att-001 = 2026-05-28, att-002 = 2026-05-15 only fit 2026-05-01 to 2026-05-31
    renderPage('from=2026-05-01&to=2026-05-31')
    expect(screen.getAllByRole('article').length).toBe(2)
  })

  it('shows Clear all when date params are active', () => {
    renderPage('from=2026-05-01')
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })
})
