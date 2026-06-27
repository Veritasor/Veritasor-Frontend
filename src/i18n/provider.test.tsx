import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { LocaleProvider } from './provider'
import messages from './messages/en.json'

beforeEach(() => {
  window.localStorage.clear()
})

describe('LocaleProvider', () => {
  it('uses the saved locale preference', () => {
    window.localStorage.setItem('preferred-locale', 'es')
    render(<LocaleProvider><div>hello</div></LocaleProvider>)
    expect(document.documentElement.lang).toBe('es')
  })

  it('falls back to browser locale for es-MX', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'es-MX', configurable: true })
    render(<LocaleProvider><div>hello</div></LocaleProvider>)
    expect(document.documentElement.lang).toBe('es')
  })
})
