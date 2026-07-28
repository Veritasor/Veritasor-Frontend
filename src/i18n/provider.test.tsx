import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { LocaleProvider } from './provider'

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
