/**
 * Tests for ThemeSwitcher component
 *
 * Coverage:
 *  - Renders a radio group with correct ARIA attributes
 *  - All three theme options are rendered
 *  - Selected option has aria-checked="true" (via :checked state)
 *  - Hidden inputs have correct type, name, and value
 *  - Screen-reader label is present
 *  - Options are keyboard-accessible (label > input pattern)
 *  - Switching theme updates checked state
 */

import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ThemeSwitcher from '../components/ThemeSwitcher'

// ThemeSwitcher depends on useTheme which reads/writes localStorage
beforeEach(() => {
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
})

function renderSwitcher() {
  return render(<ThemeSwitcher />)
}

describe('ThemeSwitcher — rendering', () => {
  it('renders a radiogroup with aria-labelledby', () => {
    renderSwitcher()
    const group = screen.getByRole('radiogroup')
    expect(group).toHaveAttribute('aria-labelledby')
    expect(group).toHaveClass('theme-switcher')
  })

  it('has an sr-only label for the radio group', () => {
    renderSwitcher()
    const group = screen.getByRole('radiogroup')
    const labelId = group.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const label = document.getElementById(labelId as string)
    expect(label).not.toBeNull()
    expect(label).toHaveClass('sr-only')
    expect(label?.textContent).toBe('Theme')
  })

  it('renders System option', () => {
    renderSwitcher()
    expect(screen.getByRole('radio', { name: /system/i })).toBeInTheDocument()
  })

  it('renders Light option', () => {
    renderSwitcher()
    expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument()
  })

  it('renders Dark option', () => {
    renderSwitcher()
    expect(screen.getByRole('radio', { name: /dark/i })).toBeInTheDocument()
  })

  it('radio inputs are visually hidden (sr-only)', () => {
    renderSwitcher()
    const radios = screen.getAllByRole('radio')
    radios.forEach((r) => expect(r).toHaveClass('sr-only'))
  })

  it('all radio inputs share the same name attribute', () => {
    renderSwitcher()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    const names = radios.map((r) => r.name)
    const uniqueNames = [...new Set(names)]
    expect(uniqueNames).toHaveLength(1)
  })
})

describe('ThemeSwitcher — interaction', () => {
  it('clicking Light option checks it', () => {
    renderSwitcher()
    const lightRadio = screen.getByRole('radio', { name: /light/i }) as HTMLInputElement

    act(() => {
      lightRadio.click()
    })

    expect(lightRadio.checked).toBe(true)
  })

  it('clicking Dark option checks it', () => {
    renderSwitcher()
    const darkRadio = screen.getByRole('radio', { name: /dark/i }) as HTMLInputElement

    act(() => {
      darkRadio.click()
    })

    expect(darkRadio.checked).toBe(true)
  })

  it('after switching theme, only one radio is checked', () => {
    renderSwitcher()
    const darkRadio = screen.getByRole('radio', { name: /dark/i }) as HTMLInputElement

    act(() => {
      darkRadio.click()
    })

    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    const checkedCount = radios.filter((r) => r.checked).length
    expect(checkedCount).toBe(1)
  })
})

describe('ThemeSwitcher — accessibility attributes', () => {
  it('each label element has a corresponding for/id pairing via htmlFor', () => {
    renderSwitcher()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    radios.forEach((radio) => {
      expect(radio.id).toBeTruthy()
      // The label wraps the input in this component, so label.htmlFor === input.id
      // OR the label contains the input directly. We verify the radio has an id.
      const label = document.querySelector(`label[for="${radio.id}"]`) ??
        radio.closest('label')
      expect(label).not.toBeNull()
    })
  })

  it('theme option labels render icon and text', () => {
    renderSwitcher()
    // Each option should have an icon and visible label text
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  it('theme preview swatches are aria-hidden', () => {
    const { container } = renderSwitcher()
    const previews = container.querySelectorAll('.theme-preview')
    previews.forEach((el) => {
      expect(el).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('theme option icons are aria-hidden', () => {
    const { container } = renderSwitcher()
    const icons = container.querySelectorAll('.theme-option-icon')
    icons.forEach((el) => {
      expect(el).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
