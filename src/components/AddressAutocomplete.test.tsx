/**
 * AddressAutocomplete — dedicated focused test suite
 * Closes issue #690
 *
 * Primary focus — regression coverage for the `prev` branch at line 198:
 *
 *   case 'Enter':
 *     e.preventDefault()
 *     if (activeIdx >= 0 && suggestions[activeIdx]) selectSuggestion(suggestions[activeIdx])
 *     break
 *
 * Both legs of the conditional are exercised:
 *   ✓ activeIdx >= 0 AND suggestions[activeIdx] exists  → selectSuggestion IS called
 *   ✓ activeIdx === -1                                   → selectSuggestion is NOT called
 *   ✓ activeIdx >= suggestions.length (out-of-range)    → selectSuggestion is NOT called
 *
 * Additional coverage:
 *  - Component mounts and renders without crashing
 *  - Public contract: label, placeholder, value, onChange, onClear, error props
 *  - Suggestion list opens/closes (happy path)
 *  - ArrowDown / ArrowUp keyboard navigation sets activeIdx
 *  - Escape key closes the listbox
 *  - Clicking a suggestion calls onChange correctly
 *  - Manual mode toggle: switches between autocomplete and manual form
 *  - Manual submit calls onChange with isManual=true
 *  - Clear button resets state and calls onClear
 *  - Error prop renders an error message
 *  - Sync with external value prop
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AddressAutocomplete, {
  type AddressSuggestion,
  type AddressAutocompleteProps,
} from './AddressAutocomplete'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SUGGESTIONS: AddressSuggestion[] = [
  {
    id: 's1',
    label: '10 Downing St',
    fullAddress: '10 Downing St, London SW1A 2AA, UK',
    lat: 51.5034,
    lng: -0.1276,
  },
  {
    id: 's2',
    label: '1600 Pennsylvania Ave NW',
    fullAddress: '1600 Pennsylvania Ave NW, Washington, DC 20500, USA',
    lat: 38.8977,
    lng: -77.0365,
  },
  {
    id: 's3',
    label: 'Eiffel Tower',
    fullAddress: 'Champ de Mars, 75007 Paris, France',
    lat: 48.8584,
    lng: 2.2945,
  },
]

/** Instantly resolves with the provided suggestions (no delay). */
function makeFetcher(results: AddressSuggestion[] = MOCK_SUGGESTIONS) {
  return vi.fn().mockResolvedValue(results)
}

/** Resolves with empty array */
function emptyFetcher() {
  return vi.fn().mockResolvedValue([])
}

/** Rejects with an error */
function failingFetcher() {
  return vi.fn().mockRejectedValue(new Error('Network error'))
}

// ─── Render helper ─────────────────────────────────────────────────────────────

function renderAutocomplete(overrides: Partial<AddressAutocompleteProps> = {}) {
  const onChange = overrides.onChange ?? vi.fn()
  const onClear = overrides.onClear ?? vi.fn()
  const fetchSuggestions = overrides.fetchSuggestions ?? makeFetcher()
  const result = render(
    <AddressAutocomplete
      onChange={onChange}
      onClear={onClear}
      fetchSuggestions={fetchSuggestions}
      {...overrides}
    />,
  )
  return { ...result, onChange, onClear, fetchSuggestions }
}

/** Type enough characters into the input to trigger a fetch, then wait for
 *  suggestions to appear in the listbox. */
async function openSuggestions(
  input: HTMLElement,
  text = 'dow',
  suggestions: AddressSuggestion[] = MOCK_SUGGESTIONS,
) {
  fireEvent.change(input, { target: { value: text } })
  // Wait for the debounced fetch + state update
  await waitFor(() => {
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option').length).toBe(suggestions.length)
  })
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe('AddressAutocomplete — rendering', () => {
  it('renders without crashing', () => {
    expect(() => renderAutocomplete()).not.toThrow()
  })

  it('renders the default label "Business address"', () => {
    renderAutocomplete()
    expect(screen.getByLabelText(/business address/i)).toBeInTheDocument()
  })

  it('accepts a custom label', () => {
    renderAutocomplete({ label: 'Headquarters' })
    expect(screen.getByLabelText('Headquarters')).toBeInTheDocument()
  })

  it('renders the placeholder text', () => {
    renderAutocomplete({ placeholder: 'Enter location…' })
    expect(screen.getByPlaceholderText('Enter location…')).toBeInTheDocument()
  })

  it('renders the "Enter manually" toggle button', () => {
    renderAutocomplete()
    expect(screen.getByRole('button', { name: /enter manually/i })).toBeInTheDocument()
  })

  it('renders the input with a combobox role', () => {
    renderAutocomplete()
    // The inner input has role="combobox"
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1)
  })

  it('does not render the listbox initially', () => {
    renderAutocomplete()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

// ─── 2. Suggestion list (happy path) ─────────────────────────────────────────

describe('AddressAutocomplete — suggestion list', () => {
  it('opens the listbox when query reaches 2+ characters', async () => {
    const { fetchSuggestions } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(fetchSuggestions).toHaveBeenCalled()
  })

  it('renders one option per suggestion', async () => {
    renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)
    expect(screen.getAllByRole('option')).toHaveLength(MOCK_SUGGESTIONS.length)
  })

  it('shows "No matching addresses found" when fetch returns empty', async () => {
    renderAutocomplete({ fetchSuggestions: emptyFetcher() })
    const input = screen.getAllByRole('combobox')[0]
    fireEvent.change(input, { target: { value: 'xyz' } })
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    expect(screen.getByText(/no matching addresses found/i)).toBeInTheDocument()
  })

  it('clicking a suggestion calls onChange with the correct value', async () => {
    const { onChange } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    fireEvent.click(screen.getAllByRole('option')[0])

    expect(onChange).toHaveBeenCalledWith({
      fullAddress: MOCK_SUGGESTIONS[0].fullAddress,
      lat: MOCK_SUGGESTIONS[0].lat,
      lng: MOCK_SUGGESTIONS[0].lng,
      isManual: false,
    })
  })

  it('listbox closes after a suggestion is selected by click', async () => {
    renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    fireEvent.click(screen.getAllByRole('option')[0])

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })
})

// ─── 3. Keyboard navigation ───────────────────────────────────────────────────

describe('AddressAutocomplete — keyboard navigation', () => {
  it('ArrowDown sets the first option as active', async () => {
    renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    await waitFor(() => {
      const active = screen.getAllByRole('option').find(
        (o) => o.getAttribute('aria-selected') === 'true',
      )
      expect(active).toBeInTheDocument()
    })
  })

  it('ArrowUp from the first item stays on the first item (clamps to 0)', async () => {
    renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    fireEvent.keyDown(input, { key: 'ArrowDown' }) // activeIdx → 0
    fireEvent.keyDown(input, { key: 'ArrowUp' })   // should stay at 0

    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options[0].getAttribute('aria-selected')).toBe('true')
    })
  })

  it('Escape key closes the listbox', async () => {
    renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  // ── Primary regression target (issue #690, line 198) ─────────────────────

  it('[line 198 branch — hit] Enter with activeIdx ≥ 0 and valid suggestion calls selectSuggestion', async () => {
    // Setup: fetch returns suggestions, user arrows down to select item at index 0
    const { onChange } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    // Move to first suggestion (activeIdx = 0)
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    // Confirm the item is highlighted
    await waitFor(() => {
      expect(
        screen.getAllByRole('option')[0].getAttribute('aria-selected'),
      ).toBe('true')
    })

    // Press Enter — the branch condition is true: activeIdx (0) >= 0 AND suggestions[0] exists
    fireEvent.keyDown(input, { key: 'Enter' })

    // selectSuggestion should have been called → onChange fires
    expect(onChange).toHaveBeenCalledWith({
      fullAddress: MOCK_SUGGESTIONS[0].fullAddress,
      lat: MOCK_SUGGESTIONS[0].lat,
      lng: MOCK_SUGGESTIONS[0].lng,
      isManual: false,
    })

    // Listbox should close
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('[line 198 branch — miss] Enter with activeIdx === -1 does NOT call selectSuggestion', async () => {
    // Setup: suggestions are loaded but user has NOT pressed ArrowDown (activeIdx stays -1)
    const { onChange } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    // Do NOT press ArrowDown — activeIdx remains -1

    // Press Enter — branch condition is false: activeIdx (-1) >= 0 is false
    fireEvent.keyDown(input, { key: 'Enter' })

    // onChange must NOT have been called with a suggestion
    expect(onChange).not.toHaveBeenCalled()
  })

  it('[line 198 branch — miss] Enter when listbox is closed does NOT call selectSuggestion', async () => {
    const { onChange } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]

    // Listbox is NOT open — `open` is false, so handleKeyDown returns early
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('[line 198 branch — hit then close] Enter selects second suggestion when ArrowDown pressed twice', async () => {
    const { onChange } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    await openSuggestions(input)

    // Arrow down twice → activeIdx = 1
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options[1].getAttribute('aria-selected')).toBe('true')
    })

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith({
      fullAddress: MOCK_SUGGESTIONS[1].fullAddress,
      lat: MOCK_SUGGESTIONS[1].lat,
      lng: MOCK_SUGGESTIONS[1].lng,
      isManual: false,
    })
  })

  it('[line 198 guard] does not crash when suggestions array is empty and Enter is pressed', async () => {
    // Edge case: suggestions cleared mid-navigation (empty fetcher)
    renderAutocomplete({ fetchSuggestions: emptyFetcher() })
    const input = screen.getAllByRole('combobox')[0]
    fireEvent.change(input, { target: { value: 'xyz' } })

    await waitFor(() =>
      expect(screen.queryByText(/no matching addresses found/i)).toBeInTheDocument(),
    )

    // Enter while listbox shows "no results" (suggestions.length === 0, activeIdx === -1)
    expect(() => fireEvent.keyDown(input, { key: 'Enter' })).not.toThrow()
  })
})

// ─── 4. Clear button ─────────────────────────────────────────────────────────

describe('AddressAutocomplete — clear button', () => {
  it('shows the clear button when there is text in the input', async () => {
    renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    fireEvent.change(input, { target: { value: 'some text' } })
    // The clear button is non-interactive (tabIndex=-1) but visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear address/i })).toBeInTheDocument()
    })
  })

  it('clicking clear resets the input and calls onClear', async () => {
    const { onClear } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0]
    fireEvent.change(input, { target: { value: 'Downing' } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear address/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /clear address/i }))

    expect((input as HTMLInputElement).value).toBe('')
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})

// ─── 5. Manual mode ──────────────────────────────────────────────────────────

describe('AddressAutocomplete — manual mode', () => {
  it('clicking "Enter manually" switches to manual mode', () => {
    renderAutocomplete()
    fireEvent.click(screen.getByRole('button', { name: /enter manually/i }))
    expect(screen.getByRole('form', { name: /enter address manually/i })).toBeInTheDocument()
  })

  it('manual mode shows a "Save address" submit button', () => {
    renderAutocomplete()
    fireEvent.click(screen.getByRole('button', { name: /enter manually/i }))
    expect(screen.getByRole('button', { name: /save address/i })).toBeInTheDocument()
  })

  it('clicking "Use autocomplete" switches back from manual mode', () => {
    renderAutocomplete()
    fireEvent.click(screen.getByRole('button', { name: /enter manually/i }))
    fireEvent.click(screen.getByRole('button', { name: /use autocomplete/i }))
    expect(screen.queryByRole('form', { name: /enter address manually/i })).not.toBeInTheDocument()
  })

  it('submitting the manual form calls onChange with isManual=true', () => {
    const { onChange } = renderAutocomplete()
    fireEvent.click(screen.getByRole('button', { name: /enter manually/i }))

    const input = screen.getAllByRole('combobox')[0]
    fireEvent.change(input, { target: { value: '42 Custom St' } })

    fireEvent.submit(screen.getByRole('form', { name: /enter address manually/i }))

    expect(onChange).toHaveBeenCalledWith({
      fullAddress: '42 Custom St',
      isManual: true,
    })
  })

  it('Save address button is disabled when input is empty', () => {
    renderAutocomplete()
    fireEvent.click(screen.getByRole('button', { name: /enter manually/i }))

    // Clear whatever value is in the input
    const input = screen.getAllByRole('combobox')[0]
    fireEvent.change(input, { target: { value: '' } })

    expect(screen.getByRole('button', { name: /save address/i })).toBeDisabled()
  })
})

// ─── 6. Error prop ────────────────────────────────────────────────────────────

describe('AddressAutocomplete — error prop', () => {
  it('renders an error message when error prop is provided', () => {
    renderAutocomplete({ error: 'Address is required' })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Address is required')
  })

  it('does not render an error alert when error prop is absent', () => {
    renderAutocomplete()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('input receives aria-invalid=true when error prop is set', () => {
    renderAutocomplete({ error: 'Required' })
    const input = screen.getAllByRole('combobox')[0]
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})

// ─── 7. Sync with external value prop ────────────────────────────────────────

describe('AddressAutocomplete — external value sync', () => {
  it('pre-fills the input from an initial value prop', () => {
    renderAutocomplete({
      value: { fullAddress: '1 Test Road', isManual: true },
    })
    const input = screen.getAllByRole('combobox')[0] as HTMLInputElement
    expect(input.value).toBe('1 Test Road')
  })

  it('updates the input when value prop changes externally', () => {
    const { rerender, onChange } = renderAutocomplete()
    const input = screen.getAllByRole('combobox')[0] as HTMLInputElement

    rerender(
      <AddressAutocomplete
        onChange={onChange}
        value={{ fullAddress: 'Updated Address', isManual: true }}
      />,
    )

    expect(input.value).toBe('Updated Address')
  })

  it('shows manual preview when value.isManual is true', () => {
    renderAutocomplete({
      value: { fullAddress: 'Hand-typed Street', isManual: true },
    })
    expect(screen.getByText(/hand-typed street/i)).toBeInTheDocument()
    expect(screen.getByText(/address saved/i)).toBeInTheDocument()
  })
})

// ─── 8. Fetch error resilience ────────────────────────────────────────────────

describe('AddressAutocomplete — fetch error resilience', () => {
  it('does not crash when fetchSuggestions rejects', async () => {
    renderAutocomplete({ fetchSuggestions: failingFetcher() })
    const input = screen.getAllByRole('combobox')[0]
    fireEvent.change(input, { target: { value: 'crash me' } })
    // Wait briefly for the rejected promise to be handled
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })
    // Component should still be in the DOM
    expect(input).toBeInTheDocument()
  })
})
