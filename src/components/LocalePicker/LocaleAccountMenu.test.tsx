import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ReactElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import LocaleAccountMenu from './LocaleAccountMenu'
import { LocaleProvider } from '../../i18n/provider'

function renderWithProvider(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>)
}

function mockMobile(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('LocaleAccountMenu — i18n framework UX', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })

  it('renders the current language (native script + English + code) in the trigger', () => {
    renderWithProvider(<LocaleAccountMenu />)
    const trigger = screen.getByRole('button', { name: /language: english/i })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('opens the panel when the trigger is clicked and exposes a labelled dialog', () => {
    renderWithProvider(<LocaleAccountMenu />)
    const trigger = screen.getByRole('button', { name: /language: english/i })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: /language/i })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/dates, numbers, and currencies follow/i)).toBeInTheDocument()
  })

  it('opens the panel with the ArrowDown key', () => {
    renderWithProvider(<LocaleAccountMenu />)
    const trigger = screen.getByRole('button', { name: /language: english/i })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', () => {
    renderWithProvider(<LocaleAccountMenu />)
    const trigger = screen.getByRole('button', { name: /language: english/i })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes when clicking outside the menu', () => {
    renderWithProvider(<LocaleAccountMenu />)
    const trigger = screen.getByRole('button', { name: /language: english/i })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('surfaces translator copy guidance (ICU patterns)', () => {
    renderWithProvider(<LocaleAccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }))
    const summary = screen.getByText(/translator copy guidance/i)
    expect(summary).toBeInTheDocument()
    fireEvent.click(summary)
    expect(screen.getByText(/use icu messageformat/i)).toBeInTheDocument()
  })

  it('closes the account menu after a locale is selected and updates the document language', () => {
    renderWithProvider(<LocaleAccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }))
    // open the inner locale picker
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    fireEvent.click(screen.getByText('Español'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('applies RTL direction when an RTL locale is selected', () => {
    renderWithProvider(<LocaleAccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }))
    fireEvent.click(screen.getByRole('button', { name: /select language/i }))
    fireEvent.click(screen.getByText('العربية'))
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('renders as a bottom sheet on mobile viewports', () => {
    mockMobile(true)
    renderWithProvider(<LocaleAccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toMatch(/fixed inset-x-0 bottom-0/)
  })

  it('falls back to a supported locale when the saved preference is invalid', () => {
    window.localStorage.setItem('preferred-locale', 'xx-unsupported')
    renderWithProvider(<LocaleAccountMenu />)
    // normalizeLocale falls back to the default supported locale (en)
    expect(screen.getByRole('button', { name: /language: english/i })).toBeInTheDocument()
  })
})
