import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AddressAutocomplete from './AddressAutocomplete'

describe('AddressAutocomplete - query length branch (line 137)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clears suggestions and closes dropdown when query is less than 2 characters', async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([
      { id: '1', label: '123 Main St', fullAddress: '123 Main St, City, Country' }
    ])
    const onChange = vi.fn()

    render(<AddressAutocomplete onChange={onChange} fetchSuggestions={fetchSuggestions} />)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const input = screen.getByRole('combobox')

    // Adjacent successful behavior: length >= 2
    await user.type(input, '12')
    vi.advanceTimersByTime(300) // debounce delay

    await waitFor(() => {
      expect(fetchSuggestions).toHaveBeenCalledWith('12')
    })
    
    // Wait for the mock promise to resolve and state to update
    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      expect(screen.getByText('123 Main St')).toBeInTheDocument()
    })

    // Target branch behavior: length < 2
    await user.type(input, '{Backspace}') // query becomes '1'
    vi.advanceTimersByTime(300) // debounce delay

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    // Verify it doesn't call fetchSuggestions for query length < 2
    expect(fetchSuggestions).toHaveBeenCalledTimes(1)
  })
})
