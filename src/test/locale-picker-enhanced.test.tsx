/**
 * Tests for the enhanced LocalePicker with search and completion % (#276)
 *
 * Covers:
 *  - Search input filters by native and English name (fuzzy)
 *  - Native name is displayed alongside English name
 *  - Locale code badge is visible for each option
 *  - Translation-completion chip appears for non-100% locales
 *  - Completion chip has an accessible aria-label
 *  - lang attribute is set on native name spans (WCAG SC 3.1.2)
 *  - 100%-complete locales (English) do not show a completion chip
 *  - Empty state shown when search has no results
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import LocalePicker from '../../components/LocalePicker/LocalePicker'
import { LocaleProvider } from '../../i18n/provider'
import { SUPPORTED_LOCALES } from '../../i18n/config'

function renderWithProvider(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>)
}

describe('LocalePicker — enhanced (#276)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('opens the listbox when trigger is clicked', () => {
    renderWithProvider(<LocalePicker />)
    const trigger = screen.getByRole('button', { name: /select language/i })
    fireEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('shows a search input when the picker is open', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    expect(screen.getByPlaceholderText(/search languages/i)).toBeInTheDocument()
  })

  it('filters locales by English name (case-insensitive)', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    const input = screen.getByPlaceholderText(/search languages/i)
    fireEvent.change(input, { target: { value: 'German' } })
    expect(screen.getByText('Deutsch')).toBeInTheDocument()
    expect(screen.queryByText('Español')).not.toBeInTheDocument()
  })

  it('filters locales by native name', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    const input = screen.getByPlaceholderText(/search languages/i)
    fireEvent.change(input, { target: { value: 'Esp' } })
    expect(screen.getByText('Español')).toBeInTheDocument()
    expect(screen.queryByText('Deutsch')).not.toBeInTheDocument()
  })

  it('shows empty state when search has no results', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    const input = screen.getByPlaceholderText(/search languages/i)
    fireEvent.change(input, { target: { value: 'zzznomatch999' } })
    expect(screen.getByText(/no languages found/i)).toBeInTheDocument()
  })

  it('displays both native and English name for each option', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    // Spanish option should show both "Español" (native) and "Spanish" (English)
    expect(screen.getByText('Español')).toBeInTheDocument()
    expect(screen.getByText('Spanish')).toBeInTheDocument()
  })

  it('displays locale code badge for each option', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    // Every locale should have an uppercase code badge
    expect(screen.getByText('ES')).toBeInTheDocument()
    expect(screen.getByText('DE')).toBeInTheDocument()
  })

  it('shows a completion chip for non-100% translated locales', () => {
    // Finnish is 71% – should show a chip
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    const finnishCompletionChip = screen.getByLabelText(/71% translated/i)
    expect(finnishCompletionChip).toBeInTheDocument()
  })

  it('does not show a completion chip for English (100%)', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    // English is 100% – no chip should be visible
    expect(screen.queryByLabelText(/100% translated/i)).not.toBeInTheDocument()
  })

  it('completion chip has an accessible aria-label with percentage', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    // German is 88%
    const chip = screen.getByLabelText(/88% translated/i)
    expect(chip).toHaveAttribute('aria-label', '88% translated')
  })

  it('native name span has a lang attribute set to the locale code', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    // The Arabic native name "العربية" should be inside a span with lang="ar"
    const arabicNativeSpan = document.querySelector('span[lang="ar"]')
    expect(arabicNativeSpan).toBeInTheDocument()
    expect(arabicNativeSpan?.textContent).toContain('العربية')
  })

  it('marks the current locale as selected (aria-selected)', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    const englishOption = screen.getByRole('option', { name: /english/i })
    expect(englishOption).toHaveAttribute('aria-selected', 'true')
  })

  it('all non-selected options have aria-selected=false', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    const options = screen.getAllByRole('option')
    const nonSelected = options.filter((o) => o.getAttribute('aria-selected') !== 'true')
    expect(nonSelected.length).toBe(SUPPORTED_LOCALES.length - 1)
  })

  it('changing locale closes the listbox and announces the change', () => {
    renderWithProvider(<LocalePicker />)
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    fireEvent.click(screen.getByText('Español'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByText(/locale changed/i)).toBeInTheDocument()
  })
})
