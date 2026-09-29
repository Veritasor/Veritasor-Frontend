/**
 * Tests for ProofShareModal
 *
 * Covers:
 *  - Rendering (open / closed states)
 *  - ARIA structure and labelling
 *  - Keyboard interaction (Escape to close)
 *  - Focus management (first focusable receives focus on open)
 *  - Link Permissions (public / password radio group)
 *  - Password input visibility toggle and strength meter
 *  - Password strength levels (computeStrength thresholds)
 *  - Expiry select options
 *  - Link generation — public path (success)
 *  - Link generation — password path (weak → blocked, strong → success)
 *  - Toast notifications (success, validation error, clipboard failure)
 *  - Generate Link button disappears after link is created
 *  - Clipboard copy — success (isCopied state) and failure path
 *  - isCopied auto-reset after 2 seconds
 *  - Close interactions (X button, Cancel button, Escape key)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ProofShareModal from './ProofShareModal'
import { ToastProvider } from './ToastContext'

// ─── Helpers ───────────────────────────────────────────────────────────────

function renderModal(isOpen = true, attestationId = 'att-001') {
  const onClose = vi.fn()
  const result = render(
    <ToastProvider>
      <ProofShareModal isOpen={isOpen} onClose={onClose} attestationId={attestationId} />
    </ToastProvider>,
  )
  return { ...result, onClose }
}

// ─── Rendering ─────────────────────────────────────────────────────────────

describe('ProofShareModal — rendering', () => {
  it('renders nothing when isOpen is false', () => {
    renderModal(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the modal dialog when isOpen is true', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the heading "Share Attestation Proof"', () => {
    renderModal()
    expect(
      screen.getByRole('heading', { name: /share attestation proof/i }),
    ).toBeInTheDocument()
  })

  it('renders the Link Permissions fieldset legend', () => {
    renderModal()
    expect(screen.getByText('Link Permissions')).toBeInTheDocument()
  })

  it('renders Public and Password Protected radio options', () => {
    renderModal()
    expect(screen.getByRole('radio', { name: /public/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /password protected/i })).toBeInTheDocument()
  })

  it('defaults to Public permission selected', () => {
    renderModal()
    expect(screen.getByRole('radio', { name: /public/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /password protected/i })).not.toBeChecked()
  })

  it('renders the Expiry select with "Never expire" as default', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /expiry/i }) as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('none')
  })

  it('renders the Generate Link button by default', () => {
    renderModal()
    expect(
      screen.getByRole('button', { name: /generate link/i }),
    ).toBeInTheDocument()
  })

  it('renders the Cancel button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
  })

  it('does not render the generated link section initially', () => {
    renderModal()
    expect(screen.queryByLabelText('Generated link')).not.toBeInTheDocument()
  })
})

// ─── ARIA / Accessibility ───────────────────────────────────────────────────

describe('ProofShareModal — ARIA and accessibility', () => {
  it('dialog has role="dialog"', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dialog has aria-modal="true"', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('dialog has aria-labelledby="share-modal-title"', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'share-modal-title')
    expect(document.getElementById('share-modal-title')).toHaveTextContent(
      /share attestation proof/i,
    )
  })

  it('close button has aria-label="Close modal"', () => {
    renderModal()
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
  })

  it('password visibility toggle has aria-pressed="false" when hidden', () => {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    const toggleBtn = screen.getByRole('button', { name: /show password/i })
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('password visibility toggle has aria-pressed="true" when revealed', () => {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    const toggleBtn = screen.getByRole('button', { name: /show password/i })
    fireEvent.click(toggleBtn)
    expect(
      screen.getByRole('button', { name: /hide password/i }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('strength meter has aria-live="polite" and aria-atomic="true"', () => {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    const meter = document.getElementById('share-password-strength')
    expect(meter).toHaveAttribute('aria-live', 'polite')
    expect(meter).toHaveAttribute('aria-atomic', 'true')
  })

  it('password input has aria-describedby="share-password-strength"', () => {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'aria-describedby',
      'share-password-strength',
    )
  })
})

// ─── Keyboard & Focus ──────────────────────────────────────────────────────

describe('ProofShareModal — keyboard interactions', () => {
  it('calls onClose when Escape is pressed while open', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when Escape is pressed while closed', () => {
    const { onClose } = renderModal(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not call onClose for other keys', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: ' ' })
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('ProofShareModal — focus management', () => {
  it('focuses the first focusable element when the modal opens', () => {
    renderModal()
    // The modal focuses the first interactive element in modalRef on mount
    const firstFocusable = screen.getByLabelText('Close modal')
    expect(document.activeElement).toBe(firstFocusable)
  })
})

// ─── Permissions ───────────────────────────────────────────────────────────

describe('ProofShareModal — link permissions', () => {
  it('password input section is hidden when Public is selected', () => {
    renderModal()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('password input section appears when Password Protected is selected', () => {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('switching back to Public hides the password section', () => {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    expect(screen.getByLabelText('Password')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /public/i }))
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('Password Protected radio becomes checked when clicked', () => {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    expect(screen.getByRole('radio', { name: /password protected/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /public/i })).not.toBeChecked()
  })
})

// ─── Password visibility toggle ────────────────────────────────────────────

describe('ProofShareModal — password visibility toggle', () => {
  function openWithPassword() {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
  }

  it('password input defaults to type="password"', () => {
    openWithPassword()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('clicking Show changes input type to "text"', () => {
    openWithPassword()
    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })

  it('clicking Hide changes input type back to "password"', () => {
    openWithPassword()
    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('toggle button label updates: "Show password" → "Hide password" → "Show password"', () => {
    openWithPassword()
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }))
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()
  })
})

// ─── Password strength meter ───────────────────────────────────────────────

describe('ProofShareModal — password strength meter', () => {
  function openPasswordSection() {
    renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    return screen.getByLabelText('Password')
  }

  it('shows "Enter a password" copy when input is empty', () => {
    openPasswordSection()
    expect(
      screen.getByText(/enter a password to see its strength/i),
    ).toBeInTheDocument()
  })

  it('shows "Too short" copy for a short password (strength 1)', () => {
    const input = openPasswordSection()
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(
      screen.getByText(/too short — use at least 8 characters/i),
    ).toBeInTheDocument()
  })

  it('shows "Fair" copy for a fair password (strength 2)', () => {
    const input = openPasswordSection()
    // length ≥ 8, has upper/lower/digit but not mixed+sym or length ≥ 12
    fireEvent.change(input, { target: { value: 'Pass1ord' } })
    expect(
      screen.getByText(/fair — try adding uppercase and numbers/i),
    ).toBeInTheDocument()
  })

  it('shows "Good" copy for a good password (strength 3)', () => {
    const input = openPasswordSection()
    // length ≥ 12, upper + lower + digit, no symbol
    fireEvent.change(input, { target: { value: 'StrongPass123' } })
    expect(
      screen.getByText(/good — add a symbol for maximum strength/i),
    ).toBeInTheDocument()
  })

  it('shows "Strong" copy for a strong password (strength 4)', () => {
    const input = openPasswordSection()
    // length ≥ 12, upper + lower + digit + symbol
    fireEvent.change(input, { target: { value: 'StrongPass123!' } })
    expect(
      screen.getByText(/strong enough for a production workspace/i),
    ).toBeInTheDocument()
  })

  it('renders 4 strength bar spans', () => {
    openPasswordSection()
    const meter = document.getElementById('share-password-strength')
    const bars = meter!.querySelectorAll('.auth-strength-bar')
    expect(bars).toHaveLength(4)
  })

  it('no bars are active when password is empty', () => {
    openPasswordSection()
    const meter = document.getElementById('share-password-strength')
    const activeBars = meter!.querySelectorAll('.auth-strength-bar-active')
    expect(activeBars).toHaveLength(0)
  })

  it('activates more bars as password strength increases', () => {
    const input = openPasswordSection()
    const meter = document.getElementById('share-password-strength')!

    fireEvent.change(input, { target: { value: 'abc' } })
    expect(meter.querySelectorAll('.auth-strength-bar-active')).toHaveLength(1)

    fireEvent.change(input, { target: { value: 'Pass1ord' } })
    expect(meter.querySelectorAll('.auth-strength-bar-active')).toHaveLength(2)

    fireEvent.change(input, { target: { value: 'StrongPass123' } })
    expect(meter.querySelectorAll('.auth-strength-bar-active')).toHaveLength(3)

    fireEvent.change(input, { target: { value: 'StrongPass123!' } })
    expect(meter.querySelectorAll('.auth-strength-bar-active')).toHaveLength(4)
  })
})

// ─── Expiry select ─────────────────────────────────────────────────────────

describe('ProofShareModal — expiry select', () => {
  it('renders all four expiry options', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /expiry/i })
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /never expire/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /1 hour/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /1 day/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /1 week/i })).toBeInTheDocument()
  })

  it('changing expiry to "1 Hour" updates the select value', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /expiry/i }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: '1hour' } })
    expect(select.value).toBe('1hour')
  })

  it('changing expiry to "1 Day" updates the select value', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /expiry/i }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: '1day' } })
    expect(select.value).toBe('1day')
  })

  it('changing expiry to "1 Week" updates the select value', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /expiry/i }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: '1week' } })
    expect(select.value).toBe('1week')
  })

  it('can reset expiry back to "Never expire"', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /expiry/i }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: '1week' } })
    fireEvent.change(select, { target: { value: 'none' } })
    expect(select.value).toBe('none')
  })
})

// ─── Link generation — public ──────────────────────────────────────────────

describe('ProofShareModal — link generation (public)', () => {
  it('generates a link containing the attestationId', () => {
    renderModal(true, 'attest-xyz')
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    const linkInput = screen.getByLabelText('Generated link') as HTMLInputElement
    expect(linkInput.value).toContain('attest-xyz')
  })

  it('generated link input is read-only', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(screen.getByLabelText('Generated link')).toHaveAttribute('readonly')
  })

  it('generated link section appears after clicking Generate Link', () => {
    renderModal()
    expect(screen.queryByLabelText('Generated link')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(screen.getByLabelText('Generated link')).toBeInTheDocument()
  })

  it('Generate Link button is removed once a link is created', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(
      screen.queryByRole('button', { name: /generate link/i }),
    ).not.toBeInTheDocument()
  })

  it('shows Copy Link button after link is generated', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
  })

  it('successfully generates a public link (toast side effect verified via link presence)', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    // Success toast is triggered — verified by link being present
    expect(screen.getByLabelText('Generated link')).toBeInTheDocument()
  })
})

// ─── Link generation — password protected ─────────────────────────────────

describe('ProofShareModal — link generation (password protected)', () => {
  function setupPasswordMode() {
    const result = renderModal()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    return result
  }

  it('blocks generation and shows toast when password strength < 2 (empty)', () => {
    setupPasswordMode()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    // Error toast is triggered — verified by link NOT being generated
    expect(screen.queryByLabelText('Generated link')).not.toBeInTheDocument()
  })

  it('blocks generation and shows toast when password is too short (strength 1)', () => {
    setupPasswordMode()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    // Error toast is triggered — verified by link NOT being generated
    expect(screen.queryByLabelText('Generated link')).not.toBeInTheDocument()
  })

  it('allows generation when password meets minimum strength (strength 2)', () => {
    setupPasswordMode()
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Pass1ord' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(screen.getByLabelText('Generated link')).toBeInTheDocument()
  })

  it('allows generation with a strong password (strength 4)', () => {
    setupPasswordMode()
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPass123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(screen.getByLabelText('Generated link')).toBeInTheDocument()
  })
})

// ─── Clipboard copy ────────────────────────────────────────────────────────

describe('ProofShareModal — clipboard copy', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls navigator.clipboard.writeText with the generated link', async () => {
    renderModal(true, 'att-clip')
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))

    const linkInput = screen.getByLabelText('Generated link') as HTMLInputElement
    const expectedLink = linkInput.value

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedLink)
    })
  })

  it('shows "Copied!" after successful clipboard write', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeInTheDocument()
    })
  })

  it('hides "Copy Link" text while showing "Copied!"', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    await waitFor(() => {
      expect(screen.queryByText(/copy link/i)).not.toBeInTheDocument()
    })
  })

  it('triggers error toast when clipboard rejects (verified by Copied! not showing)', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
    })

    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    // Error toast is triggered — verified by "Copied!" never appearing
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
    expect(screen.queryByText(/copied!/i)).not.toBeInTheDocument()
  })

  it('does not show "Copied!" after clipboard failure', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })

    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    await waitFor(() => {
      expect(screen.queryByText(/copied!/i)).not.toBeInTheDocument()
    })
  })
})

// ─── isCopied auto-reset ───────────────────────────────────────────────────

describe('ProofShareModal — isCopied resets after 2 s', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reverts copy button to "Copy Link" after 2 seconds', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    // Wait for the clipboard promise to settle
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText(/copied!/i)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.queryByText(/copied!/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
  })
})

// ─── Close interactions ────────────────────────────────────────────────────

describe('ProofShareModal — close interactions', () => {
  it('calls onClose when the X (Close modal) button is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the Cancel button is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose once per Escape press (not double-fired)', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// ─── Toast calls (observable via addToast spy) ─────────────────────────────
//
// ToastProvider stores toast state but does not render messages into the DOM —
// a separate ToastContainer (not mounted here) does the rendering.
// We make toast calls observable by mocking the useToast hook directly.

const mockAddToast = vi.fn().mockReturnValue('mock-id')

vi.mock('./ToastContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('./ToastContext')>()
  return {
    ...original,
    useToast: () => ({
      toasts: [],
      addToast: mockAddToast,
      removeToast: vi.fn(),
      dismissTopToast: vi.fn(),
      dismissAllToasts: vi.fn(),
    }),
  }
})

describe('ProofShareModal — toast notifications (addToast spy)', () => {
  beforeEach(() => {
    mockAddToast.mockClear()
  })

  function renderModalWithSpy(isOpen = true, attestationId = 'att-001') {
    const onClose = vi.fn()
    render(
      <ToastProvider>
        <ProofShareModal isOpen={isOpen} onClose={onClose} attestationId={attestationId} />
      </ToastProvider>,
    )
    return { onClose }
  }

  it('calls addToast("Link generated successfully.", "success") on public link generation', () => {
    renderModalWithSpy()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(mockAddToast).toHaveBeenCalledWith('Link generated successfully.', 'success')
  })

  it('calls addToast("Please enter a stronger password.", "error") when password is too weak', () => {
    renderModalWithSpy()
    fireEvent.click(screen.getByRole('radio', { name: /password protected/i }))
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    expect(mockAddToast).toHaveBeenCalledWith('Please enter a stronger password.', 'error')
  })

  it('calls addToast("Failed to copy link.", "error") on clipboard failure', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    renderModalWithSpy()
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Failed to copy link.', 'error')
    })
  })
})


