/**
 * WebhookEventPicker tests
 *
 * Covers the searchable grouped event picker for issue #269:
 * - Rendering all event groups and events
 * - Toggling individual events
 * - Toggling entire groups (Select all / Deselect all)
 * - Search filtering
 * - Empty search state
 * - Selection count display
 * - Error message display
 * - Keyboard navigation (ArrowDown / ArrowUp)
 * - Accessibility (fieldset, checkboxes with labels, live region)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import WebhookEventPicker from '../components/webhooks/WebhookEventPicker'

function renderPicker(overrides: {
  selected?: string[]
  onChange?: (selected: string[]) => void
  error?: string
} = {}) {
  const onChange = overrides.onChange ?? vi.fn()
  return {
    onChange,
    ...render(
      <WebhookEventPicker
        selected={overrides.selected ?? []}
        onChange={onChange}
        error={overrides.error}
      />,
    ),
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('WebhookEventPicker — rendering', () => {
  it('renders the event subscriptions legend', () => {
    renderPicker()
    expect(screen.getByText(/event subscriptions/i)).toBeInTheDocument()
  })

  it('shows "0 of 12 selected" when nothing is selected', () => {
    renderPicker()
    expect(screen.getByText(/0 of 12 selected/i)).toBeInTheDocument()
  })

  it('renders all 4 event groups', () => {
    renderPicker()
    expect(screen.getByText('ATTESTATION')).toBeInTheDocument()
    expect(screen.getByText('REVENUE SOURCES')).toBeInTheDocument()
    expect(screen.getByText('BILLING')).toBeInTheDocument()
    expect(screen.getByText('KEY MANAGEMENT')).toBeInTheDocument()
  })

  it('renders all 12 individual event checkboxes', () => {
    renderPicker()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(12)
  })

  it('renders a search input with placeholder', () => {
    renderPicker()
    expect(screen.getByPlaceholderText(/search events/i)).toBeInTheDocument()
  })

  it('shows Select all / Deselect all buttons for each group', () => {
    renderPicker()
    const selectAllButtons = screen.getAllByRole('button', { name: /select all/i })
    expect(selectAllButtons.length).toBeGreaterThanOrEqual(4)
  })
})

// ─── Selection ────────────────────────────────────────────────────────────────

describe('WebhookEventPicker — selection', () => {
  it('toggles an event when its checkbox is clicked', () => {
    const { onChange } = renderPicker()
    const checkbox = screen.getByLabelText(/attestation completed/i)
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith(['attestation.completed'])
  })

  it('removes an event when it is already selected', () => {
    const { onChange } = renderPicker({ selected: ['attestation.completed'] })
    const checkbox = screen.getByLabelText(/attestation completed/i)
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('updates the selection count display', () => {
    renderPicker({ selected: ['attestation.completed', 'source.connected'] })
    expect(screen.getByText(/2 of 12 selected/i)).toBeInTheDocument()
  })

  it('selects all events in a group via "Select all" button', () => {
    const { onChange } = renderPicker()
    const selectAllBtns = screen.getAllByRole('button', { name: /select all attestation events/i })
    fireEvent.click(selectAllBtns[0])
    expect(onChange).toHaveBeenCalledWith([
      'attestation.completed',
      'attestation.failed',
      'attestation.started',
    ])
  })

  it('deselects all events in a group when "Deselect all" is clicked', () => {
    const { onChange } = renderPicker({
      selected: ['attestation.completed', 'attestation.failed', 'attestation.started'],
    })
    const deselectAllBtn = screen.getByRole('button', { name: /deselect all attestation events/i })
    fireEvent.click(deselectAllBtn)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('selects all button label changes to "Deselect all" when all group events are selected', () => {
    renderPicker({
      selected: ['attestation.completed', 'attestation.failed', 'attestation.started'],
    })
    expect(
      screen.getByRole('button', { name: /deselect all attestation events/i }),
    ).toBeInTheDocument()
  })
})

// ─── Search ───────────────────────────────────────────────────────────────────

describe('WebhookEventPicker — search', () => {
  it('filters events by label text', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(searchInput, { target: { value: 'payment' } })

    expect(screen.getByLabelText(/payment succeeded/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment failed/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/attestation completed/i)).not.toBeInTheDocument()
  })

  it('filters events by event ID', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(searchInput, { target: { value: 'source.connected' } })

    expect(screen.getByLabelText(/source connected/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/source disconnected/i)).not.toBeInTheDocument()
  })

  it('filters by group label', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(searchInput, { target: { value: 'billing' } })

    expect(screen.getByLabelText(/invoice created/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment succeeded/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment failed/i)).toBeInTheDocument()
  })

  it('shows "No events found" for a search with no matches', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } })

    expect(screen.getByText(/no events found/i)).toBeInTheDocument()
  })

  it('clears search and restores all events when clear button is clicked', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(searchInput, { target: { value: 'payment' } })
    expect(screen.queryByLabelText(/attestation completed/i)).not.toBeInTheDocument()

    const clearBtn = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearBtn)

    expect(screen.getByLabelText(/attestation completed/i)).toBeInTheDocument()
  })

  it('is case-insensitive', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(searchInput, { target: { value: 'ATTESTATION' } })

    expect(screen.getByLabelText(/attestation completed/i)).toBeInTheDocument()
  })
})

// ─── Error display ────────────────────────────────────────────────────────────

describe('WebhookEventPicker — error', () => {
  it('renders an error alert when error prop is provided', () => {
    renderPicker({ error: 'Select at least one event to subscribe to.' })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/select at least one event/i)).toBeInTheDocument()
  })

  it('does not render an error alert when error prop is undefined', () => {
    renderPicker()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// ─── Keyboard navigation ──────────────────────────────────────────────────────

describe('WebhookEventPicker — keyboard', () => {
  it('ArrowDown and ArrowUp do not throw when navigating filtered list', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)

    // ArrowDown should set focusedIndex without errors
    expect(() => {
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    }).not.toThrow()

    // ArrowUp should wrap without errors
    expect(() => {
      fireEvent.keyDown(searchInput, { key: 'ArrowUp' })
    }).not.toThrow()
  })

  it('keyboard navigation is a no-op when search yields no results', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    expect(() => {
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
      fireEvent.keyDown(searchInput, { key: 'ArrowUp' })
    }).not.toThrow()
  })
})

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('WebhookEventPicker — accessibility', () => {
  it('has a group role for the event options container', () => {
    renderPicker()
    const group = screen.getByRole('group', { name: /event subscription options/i })
    expect(group).toBeInTheDocument()
  })

  it('each event checkbox has an accessible label', () => {
    renderPicker()
    expect(screen.getByLabelText(/attestation completed/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/key revoked/i)).toBeInTheDocument()
  })

  it('has a live region for search results', () => {
    renderPicker()
    const liveRegions = screen.getAllByRole('status')
    // At least one status region for the search live announcement
    expect(liveRegions.length).toBeGreaterThanOrEqual(1)
  })

  it('search input has aria-controls pointing to the live region', () => {
    renderPicker()
    const searchInput = screen.getByPlaceholderText(/search events/i)
    expect(searchInput).toHaveAttribute('aria-controls')
  })

  it('all checkboxes use accentColor for consistent theming', () => {
    renderPicker()
    const checkbox = screen.getByLabelText(/attestation completed/i)
    expect(checkbox).toHaveStyle({ accentColor: 'var(--accent)' })
  })
})
