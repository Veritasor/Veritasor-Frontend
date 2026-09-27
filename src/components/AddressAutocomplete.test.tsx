import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import AddressAutocomplete from './AddressAutocomplete'

// Mock standard timer functions since the component uses setTimeout
vi.useFakeTimers()

describe('AddressAutocomplete - handleBlur Regression (Issue #691)', () => {
  const mockOnChange = vi.fn()
  
  // Create an instant fetcher to bypass the 280ms fake network delay
  const mockFetch = vi.fn().mockResolvedValue([
    { id: '1', label: '10 Test St', fullAddress: '10 Test St, City', lat: 0, lng: 0 }
  ])

  beforeEach(() => {
    mockOnChange.mockClear()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('closes the dropdown on a normal blur event', async () => {
    // Pass the mock fetcher as a prop
    render(<AddressAutocomplete onChange={mockOnChange} fetchSuggestions={mockFetch} />)
    
    const input = screen.getByLabelText('Business address')
    
    // Force the dropdown open by focusing and typing
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '10' } })
    
    // Advance the 300ms debounce timer inside an async act() block
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Dropdown should now be instantly visible
    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()

    // Trigger normal blur
    fireEvent.blur(input)
    
    // Fast-forward the 150ms timeout inside handleBlur
    act(() => {
      vi.advanceTimersByTime(150)
    })
    
    // Assert dropdown closed
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('aborts handleBlur and keeps dropdown open if ignoreNextBlur flag is set', async () => {
    render(<AddressAutocomplete onChange={mockOnChange} fetchSuggestions={mockFetch} />)
    
    const input = screen.getByLabelText('Business address')
    
    // Force the dropdown open
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '10' } })
    
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()

    // Simulate the user clicking the listbox or an option inside it.
    // The component sets ignoreNextBlur.current = true on onMouseDown.
    fireEvent.mouseDown(listbox)
    
    // Now trigger the blur that happens immediately after a click
    fireEvent.blur(input)
    
    // Fast-forward timers to prove the 150ms timeout was NEVER called
    act(() => {
      vi.advanceTimersByTime(150)
    })
    
    // Assert dropdown is STILL open because handleBlur returned early
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })
})