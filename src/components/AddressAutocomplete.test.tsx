import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddressAutocomplete, {
  type AddressSuggestion,
} from './AddressAutocomplete'

const LONDON: AddressSuggestion = {
  id: '1',
  label: '10 Downing St',
  fullAddress: '10 Downing St, London SW1A 2AA, UK',
  lat: 51.5034,
  lng: -0.1276,
}

/** Resolve a fetch mock only after the caller releases it. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('AddressAutocomplete', () => {
  it('renders the label, placeholder and honours the required flag', () => {
    render(
      <AddressAutocomplete
        onChange={vi.fn()}
        label="Business address"
        placeholder="Start typing your address…"
        required
      />,
    )

    const input = screen.getByLabelText(/business address/i)
    expect(input).toHaveAttribute('placeholder', 'Start typing your address…')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('button', { name: /enter manually/i })).toBeInTheDocument()
  })

  it('does not query the geocoder until the debounced query is at least two characters', async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([LONDON])
    render(<AddressAutocomplete onChange={vi.fn()} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: '1' } })

    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(fetchSuggestions).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows suggestions and reports the count once the query resolves', async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([LONDON])
    render(<AddressAutocomplete onChange={vi.fn()} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: 'Downing' } })

    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalledWith('Downing'))

    const listbox = await screen.findByRole('listbox')
    expect(listbox).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /10 downing st/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 suggestion available')
  })

  it('reports an empty result set without leaving the listbox open on stale data', async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([])
    render(<AddressAutocomplete onChange={vi.fn()} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: 'Nowhere' } })

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No suggestions found'),
    )
    expect(screen.getByText(/no matching addresses found/i)).toBeInTheDocument()
  })

  // Regression coverage for the `}).catch(() => {` branch handled in the
  // suggestion effect (src/components/AddressAutocomplete.tsx:155).
  it('surfaces a deterministic error status when the geocoder rejects', async () => {
    const fetchSuggestions = vi.fn().mockRejectedValue(new Error('geocoder offline'))
    const onChange = vi.fn()
    render(<AddressAutocomplete onChange={onChange} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: 'Downing' } })

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Could not fetch suggestions'),
    )

    // The rejected branch must not render suggestions or leak the error.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('re-enables fetching after a rejected request (loading state recovers)', async () => {
    const fetchSuggestions = vi
      .fn()
      .mockRejectedValueOnce(new Error('geocoder offline'))
      .mockResolvedValueOnce([LONDON])
    render(<AddressAutocomplete onChange={vi.fn()} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: 'Downing' } })
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Could not fetch suggestions'),
    )

    fireEvent.change(input, { target: { value: 'Downing St' } })

    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('option', { name: /10 downing st/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 suggestion available')
  })

  it('ignores a superseded request so an older response cannot overwrite newer results', async () => {
    const first = deferred<AddressSuggestion[]>()
    const second = deferred<AddressSuggestion[]>()
    const fetchSuggestions = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    render(<AddressAutocomplete onChange={vi.fn()} fetchSuggestions={fetchSuggestions} />)
    const input = screen.getByLabelText(/business address/i)

    fireEvent.change(input, { target: { value: 'Downing' } })
    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalledTimes(1))

    fireEvent.change(input, { target: { value: 'Downing St' } })
    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalledTimes(2))

    // Newer response resolves first, then the stale one — the stale data must win nothing.
    second.resolve([LONDON])
    await screen.findByRole('option', { name: /10 downing st/i })

    first.resolve([
      { id: 'stale', label: 'Stale Result', fullAddress: 'Stale Result, Nowhere' },
    ])

    await waitFor(() =>
      expect(screen.queryByRole('option', { name: /stale result/i })).not.toBeInTheDocument(),
    )
  })

  it('selects a suggestion via the keyboard and reports the chosen coordinates', async () => {
    const onChange = vi.fn()
    const fetchSuggestions = vi.fn().mockResolvedValue([LONDON])
    render(<AddressAutocomplete onChange={onChange} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: 'Downing' } })
    await screen.findByRole('option', { name: /10 downing st/i })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith({
      fullAddress: LONDON.fullAddress,
      lat: LONDON.lat,
      lng: LONDON.lng,
      isManual: false,
    })
    expect(input).toHaveValue(LONDON.fullAddress)
    expect(screen.getByRole('status')).toHaveTextContent(`Selected: ${LONDON.fullAddress}`)
  })

  it('closes the suggestion list on Escape without choosing anything', async () => {
    const onChange = vi.fn()
    const fetchSuggestions = vi.fn().mockResolvedValue([LONDON])
    render(<AddressAutocomplete onChange={onChange} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: 'Downing' } })
    await screen.findByRole('option', { name: /10 downing st/i })

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears the field and notifies the parent', async () => {
    const onClear = vi.fn()
    const fetchSuggestions = vi.fn().mockResolvedValue([LONDON])
    render(
      <AddressAutocomplete onChange={vi.fn()} onClear={onClear} fetchSuggestions={fetchSuggestions} />,
    )

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: 'Downing' } })
    await screen.findByRole('option', { name: /10 downing st/i })

    fireEvent.click(screen.getByRole('button', { name: /clear address/i, hidden: true }))

    expect(onClear).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('Address cleared')
    expect(input).toHaveValue('')
  })

  it('supports the manual-entry override without querying the geocoder', async () => {
    const onChange = vi.fn()
    const fetchSuggestions = vi.fn().mockResolvedValue([LONDON])
    render(<AddressAutocomplete onChange={onChange} fetchSuggestions={fetchSuggestions} />)

    const input = screen.getByLabelText(/business address/i)
    fireEvent.change(input, { target: { value: '1 Custom Lane' } })
    fireEvent.click(screen.getByRole('button', { name: /enter manually/i }))

    const toggle = screen.getByRole('button', { name: /use autocomplete/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('form', { name: /enter address manually/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /save address/i }))

    expect(onChange).toHaveBeenCalledWith({ fullAddress: '1 Custom Lane', isManual: true })
    expect(fetchSuggestions).not.toHaveBeenCalled()
  })

  it('exposes an external validation error through the alert region', () => {
    render(<AddressAutocomplete onChange={vi.fn()} error="Address is required" required />)

    expect(screen.getByRole('alert')).toHaveTextContent('Address is required')
    expect(screen.getByLabelText(/business address/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders a map preview when a resolved (non-manual) value carries coordinates', () => {
    render(
      <AddressAutocomplete
        onChange={vi.fn()}
        value={{ fullAddress: LONDON.fullAddress, lat: LONDON.lat, lng: LONDON.lng, isManual: false }}
      />,
    )

    const region = screen.getByRole('region', { name: /map preview of selected address/i })
    expect(region).toBeInTheDocument()
    expect(screen.getByRole('img', { name: new RegExp(LONDON.fullAddress) })).toBeInTheDocument()
  })

  it('shows a manual-saved preview (no map) for manually entered values', () => {
    render(
      <AddressAutocomplete
        onChange={vi.fn()}
        value={{ fullAddress: '1 Custom Lane', isManual: true }}
      />,
    )

    expect(screen.getByText(/1 custom lane/i)).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
