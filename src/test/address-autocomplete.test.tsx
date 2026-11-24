import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddressAutocomplete from '../components/AddressAutocomplete'
import type { AddressFetchOptions, AddressSuggestion } from '../components/AddressAutocomplete'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('AddressAutocomplete handleKeyDown regression', () => {
  it('does not intercept keyboard events when closed (regression for line 178)', () => {
    const onChange = vi.fn()
    render(<AddressAutocomplete onChange={onChange} placeholder="Test Address" />)

    const input = screen.getByPlaceholderText('Test Address')
    
    // Attempt to press ArrowDown
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    const wasPrevented = !input.dispatchEvent(event)
    
    // When closed, it should return immediately and not call e.preventDefault()
    expect(wasPrevented).toBe(false)
  })

  it('intercepts keyboard events and allows selection when open (adjacent success behavior)', async () => {
    const onChange = vi.fn()
    const mockSuggestions = [
      { id: '1', label: '10 Downing St', fullAddress: '10 Downing St, London SW1A 2AA, UK' },
      { id: '2', label: '1600 Pennsylvania', fullAddress: '1600 Pennsylvania Ave NW, Washington, DC' }
    ]
    const fetchSuggestions = vi.fn().mockResolvedValue(mockSuggestions)
    
    render(<AddressAutocomplete onChange={onChange} fetchSuggestions={fetchSuggestions} placeholder="Test Address" />)
    const input = screen.getByPlaceholderText('Test Address')

    // Type to open the suggestions
    fireEvent.change(input, { target: { value: '10' } })

    // Wait for the listbox to appear indicating it's open
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Now it is open. Press ArrowDown
    let wasPrevented = false
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
      wasPrevented = !input.dispatchEvent(event)
    })

    // When open, it prevents default on ArrowDown
    expect(wasPrevented).toBe(true)

    // Press Enter to select the first suggestion
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith({
      fullAddress: '10 Downing St, London SW1A 2AA, UK',
      isManual: false,
      lat: undefined,
      lng: undefined
    })
  })
})

describe('AddressAutocomplete out-of-order lookup guards', () => {
  it('keeps the latest results when an older lookup rejects afterwards', async () => {
    const pending = new Map<string, Deferred<AddressSuggestion[]>>()
    const fetchSuggestions = vi.fn((query: string, _options?: AddressFetchOptions) => {
      const request = createDeferred<AddressSuggestion[]>()
      pending.set(query, request)
      return request.promise
    })

    render(<AddressAutocomplete onChange={vi.fn()} fetchSuggestions={fetchSuggestions} placeholder="Test Address" />)
    const input = screen.getByPlaceholderText('Test Address')

    fireEvent.change(input, { target: { value: 'first' } })
    await waitFor(() => expect(pending.has('first')).toBe(true))

    fireEvent.change(input, { target: { value: 'second' } })
    await waitFor(() => expect(pending.has('second')).toBe(true))

    const latest: AddressSuggestion = {
      id: '2',
      label: 'Pennsylvania Ave NW',
      fullAddress: '1600 Pennsylvania Ave NW, Washington, DC 20500, USA',
    }
    await act(async () => { pending.get('second')!.resolve([latest]) })
    expect(screen.getByText(latest.label)).toBeInTheDocument()

    await act(async () => { pending.get('first')!.reject(new Error('stale request failed')) })
    expect(screen.getByText(latest.label)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 suggestion available')
  })

  it('aborts the in-flight lookup on unmount', async () => {
    let requestSignal: AbortSignal | undefined
    const fetchSuggestions = vi.fn((_query: string, options?: AddressFetchOptions) => {
      requestSignal = options?.signal
      return new Promise<AddressSuggestion[]>(() => {})
    })

    const { unmount } = render(
      <AddressAutocomplete onChange={vi.fn()} fetchSuggestions={fetchSuggestions} placeholder="Test Address" />,
    )
    fireEvent.change(screen.getByPlaceholderText('Test Address'), { target: { value: 'abort' } })
    await waitFor(() => expect(requestSignal).toBeDefined())

    expect(requestSignal!.aborted).toBe(false)
    unmount()
    expect(requestSignal!.aborted).toBe(true)
  })
})
