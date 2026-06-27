import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import LocalePicker from './LocalePicker'
import { LocaleProvider } from '../../i18n/provider'
import messages from '../../i18n/messages/en.json'

function renderWithProvider(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>)
}

describe('LocalePicker', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the current locale as selected', () => {
    renderWithProvider(<LocalePicker />)
    const trigger = screen.getByRole('button', { name: /select language/i })
    fireEvent.click(trigger)
    const option = screen.getByRole('option', { name: /english/i })
    expect(option.getAttribute('aria-selected')).toBe('true')
  })

  it('filters locales by search', () => {
    renderWithProvider(<LocalePicker />)
    const trigger = screen.getByRole('button', { name: /select language/i })
    fireEvent.click(trigger)
    const input = screen.getByPlaceholderText(/search languages/i)
    fireEvent.change(input, { target: { value: 'Esp' } })
    expect(screen.getByText('Español')).toBeInTheDocument()
  })

  it('announces locale changes', () => {
    renderWithProvider(<LocalePicker />)
    const trigger = screen.getByRole('button', { name: /select language/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByText('Español'))
    expect(screen.getByText(/locale changed/i)).toBeInTheDocument()
  })
})
