import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ToastContext'
import CommandPalette from '../components/CommandPalette'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('CommandPalette Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderPalette = (isOpen = true, onClose = vi.fn()) => {
    return render(
      <ToastProvider>
        <MemoryRouter>
          <CommandPalette isOpen={isOpen} onClose={onClose} />
        </MemoryRouter>
      </ToastProvider>
    )
  }

  it('renders nothing when closed', () => {
    renderPalette(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders search input and focus traps when open', async () => {
    renderPalette(true)
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument()
    const input = screen.getByRole('combobox')
    expect(input).toBeInTheDocument()

    // Fast-forward timers for autofocus behavior
    act(() => {
      vi.advanceTimersByTime(20)
    })
    expect(document.activeElement).toBe(input)
  })

  it('has proper WAI-ARIA combobox attributes', () => {
    renderPalette(true)
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-controls', 'cmd-list')
  })

  it('filters command list based on search query', () => {
    renderPalette(true)
    const input = screen.getByRole('combobox')

    // Before filtering, dashboard is in document
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()

    // Type query
    fireEvent.change(input, { target: { value: 'Attestations' } })

    // Non-matching options are filtered out
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument()
    expect(screen.getByText('Go to Attestations')).toBeInTheDocument()
  })

  it('displays empty state if search query returns no results', () => {
    renderPalette(true)
    const input = screen.getByRole('combobox')

    // Type non-existent query
    fireEvent.change(input, { target: { value: 'non-matching-query-xyz' } })

    expect(screen.getByText(/no results found for/i)).toBeInTheDocument()
    expect(screen.getByText(/non-matching-query-xyz/i)).toBeInTheDocument()
  })

  it('navigates with arrow keys and updates aria-activedescendant', () => {
    renderPalette(true)
    const input = screen.getByRole('combobox')

    // First item is active by default
    const firstItemId = input.getAttribute('aria-activedescendant')
    expect(firstItemId).toBeTruthy()
    const firstItem = document.getElementById(firstItemId!)
    expect(firstItem).toHaveAttribute('aria-selected', 'true')

    // Press ArrowDown
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const secondItemId = input.getAttribute('aria-activedescendant')
    expect(secondItemId).not.toBe(firstItemId)
    const secondItem = document.getElementById(secondItemId!)
    expect(secondItem).toHaveAttribute('aria-selected', 'true')

    // Press ArrowUp
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.getAttribute('aria-activedescendant')).toBe(firstItemId)
  })

  it('executes active option action on Enter', () => {
    const onClose = vi.fn()
    renderPalette(true, onClose)
    const input = screen.getByRole('combobox')

    // Press enter on default active item (Dashboard)
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledWith('/')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes command palette on Escape key', () => {
    const onClose = vi.fn()
    renderPalette(true, onClose)
    const input = screen.getByRole('combobox')

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('saves triggered items to localStorage recents and displays them first', () => {
    const { unmount } = renderPalette(true)
    const input = screen.getByRole('combobox')

    // Execute "Go to Attestations" (the 2nd item)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Unmount and open again
    unmount()
    renderPalette(true)

    // Recents group is now visible
    expect(screen.getByText('Recent Searches')).toBeInTheDocument()
    // It is shown under recents list
    const recentItem = screen.getByRole('option', { name: /go to attestations/i })
    expect(recentItem).toBeInTheDocument()
  })

  it('traps focus to input when Tab is pressed', () => {
    renderPalette(true)
    const input = screen.getByRole('combobox')

    // Focus input
    act(() => {
      vi.advanceTimersByTime(20)
    })

    // Press Tab
    fireEvent.keyDown(input, { key: 'Tab' })

    // Focus should remain trapped on input
    expect(document.activeElement).toBe(input)
  })
})
