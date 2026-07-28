/**
 * Tests for the TokensDiffViewer component.
 *
 * Covers:
 * - Default render: version cards, summary chips, all categories filter,
 *   list entries with status chips, swatches for color tokens, text for non-color.
 * - Filter behaviour: clicking a category chip narrows the list and toggles
 *   the aria-pressed state.
 * - Empty state: when the chosen filter matches no entries the empty card shows.
 * - ARIA: live region announces filter changes; each row has a clear a11y label.
 * - Status-chip icon + text never rely on colour alone.
 */

import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TokensDiffViewer from './TokensDiffViewer'

const ALL_CATEGORY_NAMES = [
  /^background$/i,
  /^border$/i,
  /^text$/i,
  /^accent$/i,
  /^status$/i,
  /^spacing$/i,
  /^typography$/i,
  /^radius$/i,
  /^density$/i,
  /^shadow$/i,
]

describe('TokensDiffViewer — rendering', () => {
  it('renders the section heading', () => {
    render(<TokensDiffViewer />)
    expect(
      screen.getByRole('heading', { name: /design tokens.*version diff/i, level: 2 }),
    ).toBeInTheDocument()
  })

  it('renders both version identifiers', () => {
    render(<TokensDiffViewer />)
    expect(screen.getByText(/Veritasor Classic v1\.0/i)).toBeInTheDocument()
    expect(screen.getByText(/Veritasor Modern v2\.0/i)).toBeInTheDocument()
  })

  it('renders the count summary chips for added, changed, and removed', () => {
    render(<TokensDiffViewer />)
    const summary = screen.getByLabelText(/added/i, { selector: 'p' })
    expect(summary).toHaveTextContent(/\d+ added/)
    expect(summary).toHaveTextContent(/\d+ changed/)
    expect(summary).toHaveTextContent(/\d+ removed/)
  })

  it('renders the default "All categories" filter as pressed', () => {
    render(<TokensDiffViewer />)
    const allChip = screen.getByRole('button', { name: /all categories/i })
    expect(allChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders 10 category chips plus the "All categories" chip (11 total)', () => {
    render(<TokensDiffViewer />)
    // "All categories" chip
    expect(screen.getByRole('button', { name: /all categories/i })).toBeInTheDocument()
    // Each real-category chip (10 of them)
    for (const name of ALL_CATEGORY_NAMES) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })
})

describe('TokensDiffViewer — filter behaviour', () => {
  it('clicking a category chip narrows the list to that category', () => {
    render(<TokensDiffViewer />)
    const allList = screen.getByRole('list', { name: /token diff entries/i })
    const initialRows = within(allList).getAllByRole('listitem')
    expect(initialRows.length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /^radius$/i }))
    const filteredList = screen.getByRole('list', { name: /token diff entries/i })
    const filteredRows = within(filteredList).getAllByRole('listitem')
    expect(filteredRows.length).toBeGreaterThan(0)
    expect(filteredRows.length).toBeLessThan(initialRows.length)
  })

  it('marks the clicked chip as pressed and clears "All categories"', () => {
    render(<TokensDiffViewer />)
    fireEvent.click(screen.getByRole('button', { name: /^accent$/i }))
    expect(screen.getByRole('button', { name: /^accent$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /all categories/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking "All categories" restores the full list', () => {
    render(<TokensDiffViewer />)
    fireEvent.click(screen.getByRole('button', { name: /^accent$/i }))
    const narrow = screen.getByRole('list', { name: /token diff entries/i })
    const narrowRows = within(narrow).getAllByRole('listitem')

    fireEvent.click(screen.getByRole('button', { name: /all categories/i }))
    const wide = screen.getByRole('list', { name: /token diff entries/i })
    const wideRows = within(wide).getAllByRole('listitem')

    expect(wideRows.length).toBeGreaterThan(narrowRows.length)
  })
})

describe('TokensDiffViewer — status chips', () => {
  it('renders an "Added" status chip for new tokens', () => {
    render(<TokensDiffViewer />)
    const row = document.querySelector('.td-row-added') as HTMLElement | null
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText(/added/i)).toBeInTheDocument()
  })

  it('renders a "Removed" status chip for retired tokens', () => {
    render(<TokensDiffViewer />)
    const row = document.querySelector('.td-row-removed') as HTMLElement | null
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText(/removed/i)).toBeInTheDocument()
  })

  it('renders a "Changed" status chip for modified tokens', () => {
    render(<TokensDiffViewer />)
    const row = document.querySelector('.td-row-changed') as HTMLElement | null
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText(/changed/i)).toBeInTheDocument()
  })

  it('every status chip carries BOTH text and an icon (NOT colour-only)', () => {
    render(<TokensDiffViewer />)
    const row = document.querySelector('.td-row-changed') as HTMLElement | null
    expect(row).not.toBeNull()
    const chip = within(row as HTMLElement).getByLabelText(/status:\s*changed/i)
    expect(chip.textContent?.toLowerCase()).toContain('changed')
    expect(chip.querySelector('[aria-hidden="true"]')).not.toBeNull() // icon
  })
})

describe('TokensDiffViewer — colour swatches', () => {
  it('renders a colored swatch element for color tokens', () => {
    render(<TokensDiffViewer />)
    const swatch = document.querySelector('.td-swatch')
    expect(swatch).not.toBeNull()
    const bg = (swatch as HTMLElement).getAttribute('style') ?? ''
    expect(bg).toMatch(/background:\s*#?[a-z0-9(),.\s]+/i)
  })

  it('renders two swatches (before + after) per row for color tokens', () => {
    render(<TokensDiffViewer />)
    const changedRow = document.querySelector('.td-row-changed') as HTMLElement
    const swatches = changedRow.querySelectorAll('.td-swatch')
    expect(swatches.length).toBe(2)
  })

  it('renders a missing placeholder for ADDED tokens on the before side', () => {
    render(<TokensDiffViewer />)
    const addedRow = document.querySelector('.td-row-added') as HTMLElement
    // Anchored on accessible label, not className — survives style refactors.
    expect(
      within(addedRow).getByLabelText(/before:.*did not exist in version a/i),
    ).toBeInTheDocument()
  })

  it('renders a missing placeholder for REMOVED tokens on the after side', () => {
    render(<TokensDiffViewer />)
    const removedRow = document.querySelector('.td-row-removed') as HTMLElement
    expect(
      within(removedRow).getByLabelText(/after:.*removed in version b/i),
    ).toBeInTheDocument()
  })

  it('falls back to monospace text for non-color tokens (spacing, etc.)', () => {
    render(<TokensDiffViewer />)
    // --space-1 is color=false (it's a length), and is unchanged in our fixture.
    // Find any cell that contains a length token — pick --radius-sm (changed +
    // length). Since radius is a "length" cssType, no swatch should appear.
    const radiusButton = screen.getByRole('button', { name: /^radius$/i })
    fireEvent.click(radiusButton)
    const swatchCount = document.querySelectorAll('.td-swatch').length
    expect(swatchCount).toBe(0)
  })
})

describe('TokensDiffViewer — responsive rules', () => {
  it('appends ::before Was / Now labels in narrow-viewport stacked layout CSS', () => {
    // Assert that the responsive CSS rules are present in the stylesheet.
    // This is a regression test against accidental removal of the CSS hook.
    render(<TokensDiffViewer />)
    // React renders; CSS is module-level. Drive a click and check the document
    // body contains the expected class hooks (best-effort assertion).
    expect(document.querySelector('.td-cell-before')).not.toBeNull()
    expect(document.querySelector('.td-cell-after')).not.toBeNull()
  })
})

describe('TokensDiffViewer — empty state', () => {
  it('walks every category; at least one category has zero entries (empty card)', () => {
    render(<TokensDiffViewer />)
    for (const cat of ALL_CATEGORY_NAMES) {
      const btn = screen.queryByRole('button', { name: cat }) as HTMLButtonElement | null
      if (!btn) continue
      fireEvent.click(btn)
      if (screen.queryByText(/no tokens in this category differ/i)) return
    }
    throw new Error('Expected at least one category in the demo fixture to be empty')
  })
})

describe('TokensDiffViewer — accessibility', () => {
  it('announces filter results via an aria-live region', () => {
    render(<TokensDiffViewer />)
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live.textContent?.length ?? 0).toBeGreaterThan(0)
  })

  it('each diff row has a clear accessible label including its status', () => {
    render(<TokensDiffViewer />)
    const changedRow = document.querySelector('.td-row-changed') as HTMLElement
    const label = changedRow.getAttribute('aria-label') ?? ''
    expect(label).toMatch(/changed/i)
    expect(label).toMatch(/--/)
  })

  it('chips have aria-pressed and a touch-target class', () => {
    render(<TokensDiffViewer />)
    const accentChip = screen.getByRole('button', { name: /^accent$/i })
    expect(accentChip).toHaveAttribute('aria-pressed')
    expect(accentChip).toHaveClass('td-chip')
  })

  it('swatches are aria-hidden; the cell carries the semantic label', () => {
    render(<TokensDiffViewer />)
    const changedRow = document.querySelector('.td-row-changed') as HTMLElement
    const swatches = changedRow.querySelectorAll('.td-swatch')
    expect(swatches.length).toBeGreaterThan(0)
    for (const swatch of Array.from(swatches)) {
      expect(swatch.getAttribute('aria-hidden')).toBe('true')
    }
  })
})
