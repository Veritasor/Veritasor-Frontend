/**
 * AddressAutocomplete Component Tests — Issue #687
 *
 * Regression coverage for the `q` fetch branch at
 * src/components/AddressAutocomplete.tsx:156 — the `.catch(() => {
 * if (!cancelled) { setLoading(false); setStatusMsg('Could not fetch
 * suggestions') } })` handler — plus the adjacent success paths that share
 * the same state machine (resolve, empty-resolve, and cancellation).
 *
 * Observable outcomes asserted (per acceptance criteria):
 *   - role="status" live-region text ("Could not fetch suggestions" on failure)
 *   - loading spinner absence after the request settles
 *   - combobox aria-expanded state
 *   - listbox content (empty-state option vs. rendered suggestions)
 *   - onChange contract on suggestion selection
 *
 * Determinism: fetchSuggestions is injected and the 300ms debounce is advanced
 * with vi.advanceTimersByTimeAsync inside act(), so the promise continuations
 * (.then/.catch state writes) always flush inside act() — no act() warnings,
 * no reliance on real timers.
 *
 * Querying note: the component renders role="combobox" on BOTH the wrapper
 * div (.addr-combobox) and the <input>, so role-based lookup would be
 * ambiguous. The input is reached via its unique placeholder instead.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import AddressAutocomplete, {
  type AddressSuggestion,
  type AddressValue,
} from './AddressAutocomplete'

// ─── Helpers ────────────────────────────────────────────────────────────────

const SUGGESTIONS: AddressSuggestion[] = [
  { id: 's1', label: '10 Downing St', fullAddress: '10 Downing St, London SW1A 2AA, UK', lat: 51.5034, lng: -0.1276 },
  { id: 's2', label: 'Eiffel Tower', fullAddress: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France', lat: 48.8584, lng: 2.2945 },
]

/**
 * Advance past the component's 300ms debounce and flush the resulting fetch
 * promise chain inside act(). advanceTimersByTimeAsync awaits between timer
 * callbacks, so .then/.catch continuations settle within the act() scope.
 */
async function runDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300)
  })
}

type RenderOptions = {
  onChange?: (value: AddressValue) => void
  onClear?: () => void
  value?: AddressValue | null
}

function setup(fetchSuggestions: (q: string) => Promise<AddressSuggestion[]>, opts: RenderOptions = {}) {
  const onChange = opts.onChange ?? vi.fn()
  return {
    onChange,
    onClear: opts.onClear ?? vi.fn(),
    ...render(
      <AddressAutocomplete
        label="Business address"
        value={opts.value ?? null}
        onChange={onChange}
        onClear={opts.onClear}
        fetchSuggestions={fetchSuggestions}
      />,
    ),
  }
}

/** The address <input> (carries role="combobox" + aria-expanded in the DOM). */
function getInput() {
  return screen.getByPlaceholderText('Start typing your address…') as HTMLInputElement
}

/** The sr-only live region that announces fetch/selection outcomes. */
function getStatus() {
  const status = screen.getByRole('status')
  expect(status).toHaveClass('sr-only')
  return status
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

// ─── Issue #687 — error branch at src/components/AddressAutocomplete.tsx:156 ──

describe('AddressAutocomplete fetch failure (issue #687)', () => {
  it('announces "Could not fetch suggestions" and stops loading when fetchSuggestions rejects', async () => {
    const fetchSuggestions = vi.fn().mockRejectedValue(new Error('geocoder down'))
    setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: '10 Downing' } })
    await runDebounce()

    expect(getStatus()).toHaveTextContent('Could not fetch suggestions')
    expect(document.querySelector('.addr-spinner')).toBeNull()
    // The listbox never opens on a failed fetch.
    expect(getInput()).toHaveAttribute('aria-expanded', 'false')
    // The fetcher was invoked with the debounced, trimmed query.
    expect(fetchSuggestions).toHaveBeenCalledWith('10 Downing')
  })

  it('does not leak a stale or empty listbox into the UI after a rejected fetch', async () => {
    const fetchSuggestions = vi.fn().mockRejectedValue(new Error('500'))
    setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: 'Paris' } })
    await runDebounce()

    expect(getStatus()).toHaveTextContent('Could not fetch suggestions')
    // aria-expanded="false" means the listbox is not rendered at all.
    expect(document.querySelector('.addr-listbox')).toBeNull()
  })

  it('keeps previously rendered suggestions visible after a subsequent fetch fails', async () => {
    const fetchSuggestions = vi.fn<() => Promise<AddressSuggestion[]>>()
      .mockResolvedValueOnce(SUGGESTIONS)
      .mockRejectedValueOnce(new Error('network blip'))
    setup(fetchSuggestions)

    const input = getInput()

    // First (successful) request renders suggestions.
    fireEvent.change(input, { target: { value: 'Tower' } })
    await runDebounce()
    expect(screen.getByRole('option', { name: /Eiffel Tower/ })).toBeInTheDocument()

    // Second request fails: error is announced, spinner stops, but the stale
    // suggestion row stays until the next successful query replaces it.
    fireEvent.change(input, { target: { value: 'Eiffel' } })
    await runDebounce()

    expect(getStatus()).toHaveTextContent('Could not fetch suggestions')
    expect(document.querySelector('.addr-spinner')).toBeNull()
    expect(screen.getByRole('option', { name: /Eiffel Tower/ })).toBeInTheDocument()
  })

  it('does not announce failure after unmount (cancelled request path)', async () => {
    const fetchSuggestions = vi.fn().mockImplementation(
      () => new Promise<AddressSuggestion[]>((_, reject) => setTimeout(() => reject(new Error('slow failure')), 1_000)),
    )
    const { unmount } = setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: 'Berlin' } })
    await runDebounce()
    const statusNode = getStatus()

    unmount()

    // The rejection fires after unmount; the `!cancelled` guard must skip all
    // state writes. The detached live region keeps its last (empty) text and
    // no unhandled rejection escapes the .catch() handler.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(statusNode).toHaveTextContent('')
  })

  it('announces a later failure after a superseded earlier request (fresh failure is not dropped)', async () => {
    const resolvers: Array<(r: AddressSuggestion[]) => void> = []
    const rejecters: Array<(reason?: unknown) => void> = []
    const fetchSuggestions = vi.fn().mockImplementation(
      () =>
        new Promise<AddressSuggestion[]>((resolve, reject) => {
          resolvers.push(resolve)
          rejecters.push(reject)
        }),
    )

    setup(fetchSuggestions)
    const input = getInput()

    // Request #1 — never settles; superseded when the query changes.
    fireEvent.change(input, { target: { value: 'Downing' } })
    await runDebounce()
    expect(fetchSuggestions).toHaveBeenCalledTimes(1)

    // Request #2 — will reject; its `cancelled` flag must be false.
    fireEvent.change(input, { target: { value: 'Downing St' } })
    await runDebounce()
    expect(fetchSuggestions).toHaveBeenCalledTimes(2)

    await act(async () => {
      rejecters[1](new Error('rate limited'))
    })

    expect(getStatus()).toHaveTextContent('Could not fetch suggestions')
    // Sanity: the superseded request's resolver was never consumed.
    expect(resolvers).toHaveLength(2)
  })

  it('recovers on a subsequent successful fetch after a failure', async () => {
    const fetchSuggestions = vi.fn<() => Promise<AddressSuggestion[]>>()
      .mockRejectedValueOnce(new Error('geocoder down'))
      .mockResolvedValueOnce(SUGGESTIONS)
    setup(fetchSuggestions)

    const input = getInput()

    fireEvent.change(input, { target: { value: 'Tower' } })
    await runDebounce()
    expect(getStatus()).toHaveTextContent('Could not fetch suggestions')

    fireEvent.change(input, { target: { value: 'Eiffel' } })
    await runDebounce()

    expect(getStatus()).toHaveTextContent('2 suggestions available')
    expect(document.querySelector('.addr-spinner')).toBeNull()
    expect(screen.getByRole('option', { name: /Eiffel Tower/ })).toBeInTheDocument()
  })
})

// ─── Adjacent success behavior sharing the same fetch branch ────────────────

describe('AddressAutocomplete fetch success paths', () => {
  it('announces the suggestion count and opens the listbox when the fetch resolves', async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue(SUGGESTIONS)
    setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: 'Downing' } })
    await runDebounce()

    expect(getStatus()).toHaveTextContent('2 suggestions available')
    expect(getInput()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('announces the singular form for exactly one suggestion', async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([SUGGESTIONS[0]])
    setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: 'Downing St' } })
    await runDebounce()

    expect(getStatus()).toHaveTextContent('1 suggestion available')
  })

  it('announces "No suggestions found" and shows the listbox empty state on an empty result', async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([])
    setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: 'zzzz' } })
    await runDebounce()

    expect(getStatus()).toHaveTextContent('No suggestions found')
    expect(getInput()).toHaveAttribute('aria-expanded', 'true')
    // Empty listbox renders the "No matching addresses found" option.
    expect(screen.getByRole('option')).toHaveTextContent('No matching addresses found')
  })

  it('does not fetch for queries shorter than 2 characters', async () => {
    const fetchSuggestions = vi.fn()
    setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: 'D' } })
    await runDebounce()

    expect(fetchSuggestions).not.toHaveBeenCalled()
    expect(getStatus()).toHaveTextContent('')
  })

  it('does not fetch while manual mode is active', async () => {
    const fetchSuggestions = vi.fn()
    setup(fetchSuggestions)

    fireEvent.click(screen.getByRole('button', { name: 'Enter manually' }))
    fireEvent.change(getInput(), { target: { value: '12 Craft Lane' } })
    await runDebounce()

    expect(fetchSuggestions).not.toHaveBeenCalled()
  })

  it('reports loading state (spinner) while a request is in flight', async () => {
    const fetchSuggestions = vi
      .fn()
      .mockImplementation(() => new Promise<AddressSuggestion[]>(() => {}))
    setup(fetchSuggestions)

    fireEvent.change(getInput(), { target: { value: 'Downing' } })
    await runDebounce()

    expect(fetchSuggestions).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.addr-spinner')).not.toBeNull()
  })

  it('fills the field and calls onChange when a suggestion is selected', async () => {
    const onChange = vi.fn()
    const fetchSuggestions = vi.fn().mockResolvedValue(SUGGESTIONS)
    setup(fetchSuggestions, { onChange })

    const input = getInput()
    fireEvent.change(input, { target: { value: 'Tower' } })
    await runDebounce()

    fireEvent.click(screen.getByRole('option', { name: /Eiffel Tower/ }))

    expect(onChange).toHaveBeenCalledWith({
      fullAddress: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
      lat: 48.8584,
      lng: 2.2945,
      isManual: false,
    })
    expect(input).toHaveValue('Champ de Mars, 5 Av. Anatole France, 75007 Paris, France')
    expect(getStatus()).toHaveTextContent('Selected: Champ de Mars, 5 Av. Anatole France, 75007 Paris, France')
  })
})
