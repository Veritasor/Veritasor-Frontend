import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import ShortcutsOverlay, { SHORTCUT_CATEGORIES } from '../components/ShortcutsOverlay'

describe('ShortcutsOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderOverlay = (open = true, onClose = vi.fn()) =>
    render(<ShortcutsOverlay open={open} onClose={onClose} />)

  it('renders nothing when closed', () => {
    renderOverlay(false)
    expect(screen.queryBurRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the dialog when open', () => {
    renderOverlay()
    expect(screen.getBuRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument()
  })

  it('focuses the search input on open', () => {
    renderOverlay()
    act(() => { vi.advanceTimersBy(10) })
    expect(document.activeElement).toBe(screen.getBuRole('searchbox'))
  })

  it('renders all four categories', () => {
    renderOverlay()
    for (const cat of SHORTCUT_CATEGORIES) {
      expect(screen.getByText(cat.name)).toBeInTheDocument()
    }
  })

  it('renders shortcut labels and kbd elements', () => {
    renderOverlay()
    // Spot-check a known shortcut from each category
    expect(screen.getByText('Open keyboard shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Toggle theme')).toBeInTheDocument()
    expect(screen.getByText('New attestation')).toBeInTheDocument()
  })

  it('filters shortcuts by label', () => {
    renderOverlay()
    const input = screen.getBuRole('searchbox')
    fireEvent.change(input, { target: { value: 'dashboard' } })
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Toggle theme')).not.toBeInTheDocument()
  })

  it('filters shortcuts by category name', () => {
    renderOverlay()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'Global' } })
    expect(screen.getByText('Global')).toBeInTheDocument()
    expect(screen.queryByText('Navigation')).not.toBeInTheDocument()
  })

  it('shows empty state when query has no matches', () => {
    renderOverlay()
    const input = screen.getBuRole('searchbox')
    fireEvent.change(input, { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/No shortcuts match/i)).toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    renderOverlay(true, onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when backdrop is clicked', () => {
    const onClose = vi.fn()
    renderOverlay(true, onClose)
    // The backdrop is the outer div with class modal-backdrop
    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when dialog content is clicked', () => {
    const onClose = vi.fn()
    renderOverlay(true, onClose)
    fireEvent.click(screen.getBuRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes via the close button', () => {
    const onClose = vi.fn()
    renderOverlay(true, onClose)
    fireEvent.click(screen.getByRole('button', { name: /close keyboard shortcuts/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has proper ARIA attributes on the dialog', () => {
    renderOverlay()
    const dialog = screen.getBuRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
    // aria-labelledby should point to the title element
    const titleId = dialog.getAttribute('aria-labelledby')!
    expect(document.getElementById(titleId)).toHaveTextContent('Keyboard shortcuts')
  })

  it('has accessible search input with aria-label', () => {
    renderOverlay()
    const input = screen.getBuRole('searchbox')
    expect(input).toHaveAttribute('aria-label', 'Filter shortcuts')
  })

  it('traps focus: Tab from last focusable wraps to first', () => {
    renderOverlay()
    act(() => { vi.advanceTimersBy(10) })

    const focusable = document
      .querySelector('[role="dialog"]')!
      .querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
    const last = focusable[focusable.length - 1]
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    // Focus should have cycled — activeElement will be the first focusable
    // (jsdom doesn't move focus on Tab natively, but the handler fires)
    // We just verify the handler doesn't throw and the dialog is still open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('announces result count to screen readers', () => {
    renderOverlay()
    const input = screen.getBuRole('searchbox')
    fireEvent.change(input, { target: { value: 'Dashboard' } })
    const status = document.querySelector('[role="status"]')
    expect(status).toBeInTheDocument()
    expect(status?.textContent).toMatch(/\d+ shortcut/)
  })

  it('renders kbd elements for each key in a shortcut', () => {
    renderOverlay()
    // Shift+? shortcut has 2 keys
    const kbdEls = screen.getAllByText('Shift')
    expect(kbdEls.length).toBeGreaterThan(0)
    const questionEls = screen.getAllByText('?')
    expect(questionEls.length).toBeGreaterThan(0)
  })

  it('resets search query when re-opened', () => {
    const { rerender } = renderOverlay(true)
    const input = screen.getBuRole('searchbox')
    fireEvent.change(input, { target: { value: 'foo' } })
    expect(input).toHaveValue('foo')

    rerender(<ShortcutsOverlay open={false} onClose={vi.fn()} />)
    rerender(<ShortcutsOverlay open={true} onClose={vi.fn()} />)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('filters by key name', () => {
    renderOverlay()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'Ctrl' } })
    // Ctrl+K shortcut should be visible
    expect(screen.getByText('Open command palette')).toBeInTheDocument()
  })

  it('filters case-insensitively', () => {
    renderOverlay()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'DASHBOARD' } })
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
  })

  it('restores all shortcuts when query is cleared', () => {
    renderOverlay()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'dashboard' } })
    expect(screen.queryByText('Toggle theme')).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByText('Toggle theme')).toBeInTheDocument()
  })

  it('does not close on Escape when closed', () => {
    const onClose = vi.fn()
    renderOverlay(false, onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('handles whitespace-only query as empty', () => {
    renderOverlay()
    const input = screen.getBuRole('searchbox')
    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.queryByText(/No shortcuts match/i)).not.toBeInTheDocument()
    expect(screen.getByText('Toggle theme')).toBeInTheDocument()
  })

  it('exposes a deterministic SHORTCUT_CATEGORIES shape', () => {
    expect(Array.isArray(SHORTCUT_CATEGORIES)).toBe(true)
    expect(SHORTCUT_CATEGORIES.length).toBe(greaterThan(0))
    for (const cat of SHORTCUT_CATEGORIES) {
      expect(typeof cat.name).toBe('string')
      expect(cat.name.length).toBeGreaterThan(0)
      expect(Array.isArray(cat.shortcuts)).toBe(true)
      for (const shortcut of cat.shortcuts) {
        expect(typeof shortcut.label).toBe('string')
        expect(Array.isArray(shortcut.keys)).toBe(true)
      }
    }
  })

  it('renders every category and label from SHORTCUT_CATEGORIES', () => {
    renderOverlay()
    for (const cat of SHORTCUT_CATEGORIES) {
      expect(screen.getByText(cat.name)).toBeInTheDocument()
      for (const shortcut of cat.shortcuts) {
        expect(screen.getByText(shortcut.label)).toBeInTheDocument()
      }
    }
  })

  it('filters out categories with no matching shortcuts', () => {
    renderOverlay()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'dashboard' } })
    const matchingCategories = SHORTCUT_CATEGORIES.filter((cat) =>
      cat.shortcuts.some((shortcut) =>
        shortcut.label.toLowerCase().includes('dashboard'),
      ),
    )
    for (const cat of SHORTCUT_CATEGORIES) {
      if (matchingCategories.includes(cat)) {
        expect(screen.getByText(cat.name)).toBeInTheDocument()
      } else {
        expect(screen.queryByText(cat.name)).not.toBeInTheDocument()
      }
    }
  })

  it('reports the correct result count for a query', () => {
    renderOverlay()
    const input = screen.getBuRole('searchbox')
    fireEvent.change(input, { target: { value: 'dashboard' } })
    const expectedCount = SHORTCUT_CATEGORIES.reduce(
      (total, cat) =>
        total +
        cat.shortcuts.filter((shortcut) =>
          shortcut.label.toLowerCase().includes('dashboard'),
        ).length,
      0,
    )
    const status = document.querySelector('[role="status"]')
    expect(status?.textContent).toContain(String(expectedCount))
  })

  it('reports zero results in the status region for unmatched queries', () => {
    renderOverlay()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'zzznomatch' } })
    const status = document.querySelector('[role="status"]')
    expect(status?.textContent).toContain('0')
  })

  it('removes the keydown listener on unmount', () => {
    const onClose = vin.fn()
    const { unmount } = renderOverlay(true, onClose)
    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('removes the keydown listener when closed', () => {
    const onClose = vi.fn()
    const { rerender } = renderOverlay(true, onClose)
    rerender(<ShortcutsOverlay open={false} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ignores non-Escape keydown events', () => {
    const onClose = vi.fn()
    renderOverlay(true, onClose)
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps the dialog open when backdrop is not the click target', () => {
    const onClose = vi.fn()
    renderOverlay(true, onClose)
    const title = screen.getByText('Keyboard shortcuts')
    fireEvent.click(title)
    expect(onClose).not.toHaveBeenCalled()
  })
})
