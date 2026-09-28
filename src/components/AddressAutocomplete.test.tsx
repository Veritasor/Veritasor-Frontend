import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddressAutocomplete from './AddressAutocomplete'

describe('AddressAutocomplete - handleInputChange regression', () => {
  it('updates query without calling onChange when typing without a confirmed value', () => {
    const onChange = vi.fn()
    render(<AddressAutocomplete onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '123' } })
    expect(input).toHaveValue('123')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears confirmed location data and calls onChange when typing over a previously selected autocomplete value', () => {
    const onChange = vi.fn()
    const value = { fullAddress: '10 Downing St, London SW1A 2AA, UK', lat: 51.5034, lng: -0.1276, isManual: false }
    render(<AddressAutocomplete value={value} onChange={onChange} />)
    
    const input = screen.getByRole('combobox')
    expect(input).toHaveValue('10 Downing St, London SW1A 2AA, UK')
    
    fireEvent.change(input, { target: { value: '10 Downing' } })
    
    // It should call onChange with the new fullAddress, and cleared lat/lng
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      fullAddress: '10 Downing',
      lat: undefined,
      lng: undefined
    })
  })

  it('does not clear location data when typing in manual mode', () => {
    const onChange = vi.fn()
    const value = { fullAddress: 'Custom Address', isManual: true }
    
    render(<AddressAutocomplete value={value} onChange={onChange} />)
    
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Custom Address Modified' } })
    
    // Because manualMode is true, the if (value && !manualMode) branch in handleInputChange is false.
    // So onChange is NOT called immediately on typing!
    expect(onChange).not.toHaveBeenCalled()
  })
})
