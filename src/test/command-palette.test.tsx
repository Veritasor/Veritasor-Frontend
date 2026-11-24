import { useState, type ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ToastContext'
import CommandPalette from '../components/CommandPalette'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function PaletteLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open command palette</button>
      <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

function renderWithProviders(component: ReactNode) {
  return render(
    <ToastProvider>
      <MemoryRouter>{component}</MemoryRouter>
    </ToastProvider>,
  )
}

function openFromLauncher() {
  const opener = screen.getByRole('button', { name: 'Open command palette' })
  opener.focus()
  fireEvent.click(opener)
  act(() => {
    vi.advanceTimersByTime(20)
  })
  return { opener, input: screen.getByRole('combobox') }
}

describe('CommandPalette Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const renderPalette = (isOpen = true, onClose = vi.fn()) =>
    renderWithProviders(<CommandPalette isOpen={isOpen} onClose={onClose} />)

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

  it('allows scope changes and keyboard execution when session storage is blocked', () => {
    const blocked = () => {
      throw new DOMException('Session storage is unavailable', 'SecurityError')
    }
    const getItem = vi.fn(blocked)
    const setItem = vi.fn(blocked)
    vi.stubGlobal('sessionStorage', { getItem, setItem })
    renderWithProviders(<PaletteLauncher />)
    const { input, opener } = openFromLauncher()
    const scope = screen.getByRole('radiogroup', { name: 'Palette scope' })

    expect(getItem).toHaveBeenCalledWith('veritasor-palette-scope')
    expect(screen.getByRole('radio', { name: /global/i })).toBeChecked()
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(scope).toHaveFocus()
    fireEvent.keyDown(scope, { key: 'ArrowRight' })
    expect(setItem).toHaveBeenCalledWith('veritasor-palette-scope', 'page')
    expect(screen.getByRole('radio', { name: /this page/i })).toBeChecked()
    expect(screen.queryByRole('option', { name: /go to dashboard/i })).not.toBeInTheDocument()

    fireEvent.keyDown(scope, { key: 'Tab' })
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', 'cmd-opt-nav-sources')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input).toHaveAttribute('aria-activedescendant', 'cmd-opt-nav-attestations')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith('/sources')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    openFromLauncher()
    expect(screen.getByRole('radio', { name: /global/i })).toBeChecked()
  })

  it('persists the selected scope and restores focus on Escape from the scope switcher', () => {
    renderWithProviders(<PaletteLauncher />)
    const { input, opener } = openFromLauncher()
    const scope = screen.getByRole('radiogroup', { name: 'Palette scope' })
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(scope).toHaveFocus()
    fireEvent.keyDown(scope, { key: 'ArrowRight' })
    expect(sessionStorage.getItem('veritasor-palette-scope')).toBe('page')

    fireEvent.keyDown(scope, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    openFromLauncher()
    expect(screen.getByRole('radio', { name: /this page/i })).toBeChecked()
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
    expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument()
    // It is shown under recents list
    const recentItem = screen.getByRole('option', { name: /go to attestations/i })
    expect(recentItem).toBeInTheDocument()
  })

  it('cycles focus between the search input and scope switcher when Tab is pressed', () => {
    renderPalette(true)
    const input = screen.getByRole('combobox')

    // Focus input
    act(() => {
      vi.advanceTimersByTime(20)
    })

    // Press Tab
    fireEvent.keyDown(input, { key: 'Tab' })

    const scope = screen.getByRole('radiogroup', { name: 'Palette scope' })
    expect(scope).toHaveFocus()
    fireEvent.keyDown(scope, { key: 'Tab' })
    expect(input).toHaveFocus()
  })
})
