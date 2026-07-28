/**
 * MFA Method Chooser tests
 *
 * Covers the radio-group MFA selection component for issue #254:
 * - Three radio-cards: TOTP, SMS, Security Key
 * - "Recommended" badge on Security Key
 * - Learn-more popover toggle per method (only one open at a time)
 * - Keyboard and screen-reader accessibility
 * - Controlled value/onChange pattern
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MfaMethodChooser from '../components/MfaMethodChooser'

function renderChooser(value: string | null = null) {
  const onChange = vi.fn()
  const result = render(<MfaMethodChooser value={value as never} onChange={onChange} />)
  return { ...result, onChange }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('MfaMethodChooser — rendering', () => {
  it('renders the fieldset with an accessible legend', () => {
    renderChooser()
    expect(screen.getByRole('group')).toBeInTheDocument()
    // The legend text (default) should be visible
    expect(screen.getByText(/choose a two-factor authentication method/i)).toBeInTheDocument()
  })

  it('renders 3 radio buttons', () => {
    renderChooser()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('renders card titles for all three methods', () => {
    renderChooser()
    expect(screen.getByText(/authenticator app/i)).toBeInTheDocument()
    expect(screen.getByText(/sms text message/i)).toBeInTheDocument()
    // "security key" appears in both the title and description
    expect(screen.getAllByText(/security key/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders icons for each method', () => {
    renderChooser()
    // Icons are rendered as text emojis
    const icons = screen.getAllByText(/^(📱|💬|🔐)$/)
    expect(icons).toHaveLength(3)
  })

  it('none is selected by default', () => {
    renderChooser()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    radios.forEach((r) => expect(r.checked).toBe(false))
  })

  it('radios share the same name attribute', () => {
    renderChooser()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    const name = radios[0].name
    expect(name).toBeTruthy()
    radios.forEach((r) => expect(r.name).toBe(name))
  })
})

// ─── Recommended badge ────────────────────────────────────────────────────────

describe('MfaMethodChooser — Recommended badge', () => {
  it('shows "Recommended" badge on security key card', () => {
    renderChooser()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
  })

  it('only shows ONE Recommended badge', () => {
    renderChooser()
    expect(screen.getAllByText('Recommended')).toHaveLength(1)
  })

  it('the Recommended badge has the correct CSS class', () => {
    renderChooser()
    const badge = screen.getByText('Recommended')
    expect(badge.className).toContain('mfa-recommended-badge')
  })
})

// ─── Pros/Cons tradeoffs ──────────────────────────────────────────────────────

describe('MfaMethodChooser — tradeoffs', () => {
  it('shows "Pros" heading in each card', () => {
    renderChooser()
    const prosHeadings = screen.getAllByText('✓ Pros')
    expect(prosHeadings).toHaveLength(3)
  })

  it('shows "Considerations" heading in each card', () => {
    renderChooser()
    const consHeadings = screen.getAllByText('✗ Considerations')
    expect(consHeadings).toHaveLength(3)
  })

  it('lists pros for TOTP', () => {
    renderChooser()
    expect(screen.getByText(/works offline/i)).toBeInTheDocument()
  })

  it('lists cons for SMS', () => {
    renderChooser()
    expect(screen.getByText(/sim-swap/i)).toBeInTheDocument()
  })

  it('lists pros for security key', () => {
    renderChooser()
    // "phishing-resistant" appears in both description and pro list item
    const matches = screen.getAllByText(/phishing-resistant/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── Learn-more popover ───────────────────────────────────────────────────────

describe('MfaMethodChooser — learn more', () => {
  it('renders 3 "Learn more" buttons', () => {
    renderChooser()
    expect(screen.getAllByRole('button', { name: /learn more about/i })).toHaveLength(3)
  })

  it('learn-more buttons have descriptive aria-labels', () => {
    renderChooser()
    expect(
      screen.getByRole('button', { name: /learn more about authenticator app/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /learn more about sms text message/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /learn more about security key/i }),
    ).toBeInTheDocument()
  })

  it('clicking Learn more opens the popover with content', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    // Should show the learn more text for TOTP (RFC 6238)
    expect(screen.getByText(/RFC 6238/i)).toBeInTheDocument()
  })

  it('the learn-more popover has aria-expanded=true when open', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    expect(totpTrigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('learn-more popover has a close button', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    expect(screen.getByRole('button', { name: /close learn more/i })).toBeInTheDocument()
  })

  it('clicking the close button closes the popover', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    const closeBtn = screen.getByRole('button', { name: /close learn more/i })
    fireEvent.click(closeBtn)

    // The content should no longer be in the DOM
    expect(screen.queryByText(/RFC 6238/i)).not.toBeInTheDocument()
    expect(totpTrigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('escape key closes the popover', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    const popover = screen.getByRole('region')
    fireEvent.keyDown(popover, { key: 'Escape' })

    expect(screen.queryByText(/RFC 6238/i)).not.toBeInTheDocument()
  })

  it('clicking the backdrop closes the popover', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    const backdrop = document.querySelector('.mfa-learn-backdrop')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)

    expect(screen.queryByText(/RFC 6238/i)).not.toBeInTheDocument()
  })

  it('only one popover can be open at a time', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    const smsTrigger = screen.getByRole('button', { name: /learn more about sms text message/i })

    // Open TOTP popover
    fireEvent.click(totpTrigger)
    expect(screen.getByText(/RFC 6238/i)).toBeInTheDocument()

    // Click SMS trigger — TOTP popover should close, SMS should open
    fireEvent.click(smsTrigger)
    expect(screen.queryByText(/RFC 6238/i)).not.toBeInTheDocument()
    expect(screen.getByText(/SS7 vulnerabilities/i)).toBeInTheDocument()
  })

  it('clicking the same Learn more again toggles it closed', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })

    fireEvent.click(totpTrigger)
    expect(screen.getByText(/RFC 6238/i)).toBeInTheDocument()

    fireEvent.click(totpTrigger)
    expect(screen.queryByText(/RFC 6238/i)).not.toBeInTheDocument()
  })

  it('learn-more popover for FIDO2/WebAuthn shows relevant content', () => {
    renderChooser()
    const skTrigger = screen.getByRole('button', { name: /learn more about security key/i })
    fireEvent.click(skTrigger)

    // FIDO2 appears in title, cons list, and popover - check popover content specifically
    expect(screen.getByText(/public-key cryptography/i)).toBeInTheDocument()
    // The popover text contains "FIDO2 (Fast IDentity Online)"
    const popoverText = screen.getByRole('region').textContent
    expect(popoverText).toContain('FIDO2')
  })
})

// ─── Selection ────────────────────────────────────────────────────────────────

describe('MfaMethodChooser — selection', () => {
  it('clicking a card selects it and calls onChange with totp', () => {
    const { onChange } = renderChooser()
    // Click the label to activate the radio inside
    const labels = document.querySelectorAll('.mfa-choice-card')
    fireEvent.click(labels[0])

    // onChange fires with the correct value; the radio's checked state depends on the parent re-rendering with the new value prop
    expect(onChange).toHaveBeenCalledWith('totp')
  })

  it('clicking SMS card calls onChange with sms', () => {
    const { onChange } = renderChooser()
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1])

    expect(onChange).toHaveBeenCalledWith('sms')
  })

  it('clicking Security Key card calls onChange with security-key', () => {
    const { onChange } = renderChooser()
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[2])

    expect(onChange).toHaveBeenCalledWith('security-key')
  })

  it('controlled value is reflected when value changes', () => {
    const { onChange, rerender } = renderChooser()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    fireEvent.click(radios[1])
    expect(onChange).toHaveBeenCalledWith('sms')

    rerender(<MfaMethodChooser value="sms" onChange={onChange} />)
    expect(radios[1]).toBeChecked()
  })

  it('only one radio is checked at a time', () => {
    const { onChange, rerender } = renderChooser()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]

    fireEvent.click(radios[0])
    rerender(<MfaMethodChooser value="totp" onChange={onChange} />)
    expect(radios[0]).toBeChecked()
    expect(radios[1]).not.toBeChecked()
    expect(radios[2]).not.toBeChecked()
  })
})

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('MfaMethodChooser — accessibility', () => {
  it('fieldset has an accessible name via legend', () => {
    renderChooser()
    const fieldset = screen.getByRole('group')
    // The fieldset's accessible name comes from the legend
    expect(fieldset).toBeInTheDocument()
  })

  it('can accept a custom aria-label as fieldset legend', () => {
    render(
      <MfaMethodChooser
        value={null}
        onChange={vi.fn()}
        aria-label="Pick your 2FA"
      />,
    )
    expect(screen.getByText('Pick your 2FA')).toBeInTheDocument()
  })

  it('fieldset has aria-describedby pointing to the description', () => {
    renderChooser()
    const fieldset = screen.getByRole('group')
    expect(fieldset).toHaveAttribute('aria-describedby')

    const descId = fieldset.getAttribute('aria-describedby')!
    const descEl = document.getElementById(descId)
    expect(descEl).toBeInTheDocument()
    expect(descEl!.tagName).toBe('P')
    expect(descEl!).toHaveClass('mfa-description')
  })

  it('learn-more triggers have aria-controls linking to the popover', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    expect(totpTrigger).toHaveAttribute('aria-controls')
  })
})

// ─── Keyboard ─────────────────────────────────────────────────────────────────

describe('MfaMethodChooser — keyboard', () => {
  it('radios can be focused via keyboard tab', () => {
    renderChooser()
    const radios = screen.getAllByRole('radio')
    radios[0].focus()
    expect(document.activeElement).toBe(radios[0])
  })

  it('learn-more buttons are focusable', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    totpTrigger.focus()
    expect(document.activeElement).toBe(totpTrigger)
  })

  it('the close button in popover is focusable', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    const closeBtn = screen.getByRole('button', { name: /close learn more/i })
    closeBtn.focus()
    expect(document.activeElement).toBe(closeBtn)
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('MfaMethodChooser — edge cases', () => {
  it('handles rapid toggle of learn more (no crash)', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })

    fireEvent.click(totpTrigger)
    fireEvent.click(totpTrigger)
    fireEvent.click(totpTrigger)
    // Should not throw
    expect(totpTrigger).toBeInTheDocument()
  })

  it('initial value of null renders no selected radios', () => {
    renderChooser()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios.every((r) => !r.checked)).toBe(true)
  })

  it('renders without crashing with all methods', () => {
    renderChooser()
    // Verify all 3 card titles are rendered (avoid ambiguous matches)
    expect(screen.getByText(/authenticator app/i)).toBeInTheDocument()
    expect(screen.getByText(/sms text message/i)).toBeInTheDocument()
    expect(screen.getAllByText(/security key/i).length).toBeGreaterThanOrEqual(1)
  })

  it('learn-more popover has the correct CSS class', () => {
    renderChooser()
    const totpTrigger = screen.getByRole('button', { name: /learn more about authenticator app/i })
    fireEvent.click(totpTrigger)

    const popover = screen.getByRole('region')
    expect(popover).toHaveClass('mfa-learn-popover')
  })
})
