import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import LocalePickerField from './LocalePickerField'
import { LocaleContext } from '../../i18n/provider'
import { SUPPORTED_LOCALES } from '../../i18n/config'
import messages from '../../i18n/messages/en.json'

function renderField(
  ui: React.ReactElement,
  providerProps: { locale: string; setLocale: (val: string) => void; dir: 'ltr' | 'rtl' } = {
    locale: 'en',
    setLocale: vi.fn(),
    dir: 'ltr',
  },
) {
  return render(
    <LocaleContext.Provider value={providerProps}>
      <IntlProvider locale="en" messages={messages}>
        {ui}
      </IntlProvider>
    </LocaleContext.Provider>,
  )
}

describe('LocalePickerField', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders default label, description, and current locale trigger', () => {
    renderField(<LocalePickerField />)

    const label = screen.getByText(messages['settings.locale.label'])
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe('LABEL')

    expect(screen.getByText(messages['settings.locale.description'])).toBeInTheDocument()

    const trigger = screen.getByRole('button', {
      name: messages['locale.picker.trigger.ariaLabel'],
    })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('English')
  })

  it('renders custom label and description when provided', () => {
    renderField(
      <LocalePickerField
        label="Preferred Language"
        description="Choose the language used across your workspace."
      />,
    )

    const label = screen.getByText('Preferred Language')
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe('LABEL')
    expect(
      screen.getByText('Choose the language used across your workspace.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(messages['settings.locale.label'])).not.toBeInTheDocument()
    expect(screen.queryByText(messages['settings.locale.description'])).not.toBeInTheDocument()
  })

  it('renders all options from SUPPORTED_LOCALES when opened', () => {
    renderField(<LocalePickerField />)

    const trigger = screen.getByRole('button', {
      name: messages['locale.picker.trigger.ariaLabel'],
    })
    fireEvent.click(trigger)

    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(SUPPORTED_LOCALES.length)

    for (const locale of SUPPORTED_LOCALES) {
      expect(
        screen.getByRole('option', { name: new RegExp(locale.nativeLabel, 'i') }),
      ).toBeInTheDocument()
    }
  })

  it('fires setLocale with the selected locale code on option click', () => {
    const setLocale = vi.fn()
    renderField(<LocalePickerField />, { locale: 'en', setLocale, dir: 'ltr' })

    const trigger = screen.getByRole('button', {
      name: messages['locale.picker.trigger.ariaLabel'],
    })
    fireEvent.click(trigger)

    fireEvent.click(screen.getByRole('option', { name: /Español/i }))

    expect(setLocale).toHaveBeenCalledTimes(1)
    expect(setLocale).toHaveBeenCalledWith('es')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('reflects the active locale from context and marks it selected', () => {
    renderField(<LocalePickerField />, { locale: 'fr', setLocale: vi.fn(), dir: 'ltr' })

    const trigger = screen.getByRole('button', {
      name: messages['locale.picker.trigger.ariaLabel'],
    })
    expect(trigger).toHaveTextContent('Français')

    fireEvent.click(trigger)
    const frenchOption = screen.getByRole('option', { name: /Français/i })
    expect(frenchOption).toHaveAttribute('aria-selected', 'true')
  })

  it('supports keyboard navigation to change locale', () => {
    const setLocale = vi.fn()
    renderField(<LocalePickerField />, { locale: 'en', setLocale, dir: 'ltr' })

    const trigger = screen.getByRole('button', {
      name: messages['locale.picker.trigger.ariaLabel'],
    })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(setLocale).toHaveBeenCalledWith(SUPPORTED_LOCALES[1].code)
  })
})
