import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Signup from './Signup'
import { ToastProvider } from '../components/ToastContext'
import { SUBMIT_DEMO_MS } from '../components/SubmitButton'

function renderSignup(initialEntries: string[] = ['/signup']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<div>Onboarding Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  localStorage.clear()
})

// ─── Initial render ──────────────────────────────────────────────────────────

describe('Signup – initial render', () => {
  it('renders the page heading and description', () => {
    renderSignup()
    expect(screen.getByRole('heading', { name: /set up your workspace/i })).toBeInTheDocument()
    expect(screen.getByText(/create a secure veritasor account/i)).toBeInTheDocument()
  })

  it('renders all form fields with correct types and autocomplete', () => {
    renderSignup()
    const name = screen.getByLabelText(/full name/i)
    expect(name).toHaveAttribute('type', 'text')
    expect(name).toHaveAttribute('autocomplete', 'name')
    expect(name).toHaveValue('')

    const company = screen.getByLabelText(/company/i)
    expect(company).toHaveAttribute('type', 'text')
    expect(company).toHaveAttribute('autocomplete', 'organization')
    expect(company).toHaveValue('')

    const email = screen.getByLabelText(/work email/i)
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'email')
    expect(email).toHaveValue('')

    const password = screen.getByLabelText(/^password$/i)
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveValue('')
  })

  it('links the password field to its hint via aria-describedby', () => {
    renderSignup()
    const password = screen.getByLabelText(/^password$/i)
    const hintId = password.getAttribute('aria-describedby')
    expect(hintId).toBeTruthy()
    expect(document.getElementById(hintId!)).toHaveTextContent(
      /use 12\+ characters with uppercase, lowercase, number, and symbol/i,
    )
  })

  it('hides the password strength preview region when password is empty', () => {
    renderSignup()
    expect(screen.queryByLabelText(/password strength preview/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/strong enough for a production workspace/i)).not.toBeInTheDocument()
  })

  it('renders the "sign in" footer link pointing to /login', () => {
    renderSignup()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })
})

// ─── Submit button – disabled until TOS acknowledged ────────────────────────

describe('Signup – submit button initial state', () => {
  it('disables the create-account button before TOS is acknowledged', () => {
    renderSignup()
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
  })

  it('does not enter a busy state when the form is submitted without TOS acknowledgement', () => {
    renderSignup()
    // The button is disabled so a form submit via Enter shouldn't fire handleSubmit,
    // but fire the form submit event directly to guard the guard clause.
    const form = document.querySelector('form.auth-form')!
    fireEvent.submit(form)
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /creating account/i })).not.toBeInTheDocument()
  })
})

// ─── TOS modal – open / close ────────────────────────────────────────────────

describe('Signup – TOS modal open and close', () => {
  it('opens the modal when "Review changes" is clicked', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the modal via the Cancel button without acknowledging', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Submit is still locked
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
  })

  it('closes the modal via the ✕ close button without acknowledging', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
  })

  it('closes the modal when the backdrop is clicked', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    const backdrop = document.querySelector('.modal-backdrop')!
    fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the modal on Escape key', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// ─── TOS modal – content ─────────────────────────────────────────────────────

describe('Signup – TOS modal content', () => {
  it('shows the current (v2.4.0) and previous (v2.3.0) version pills', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    const strip = screen.getByLabelText(/terms version summary/i)
    expect(strip).toHaveTextContent('v2.4.0')
    expect(strip).toHaveTextContent('v2.3.0')
  })

  it('exposes download links for the full text and PDF', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    expect(screen.getByRole('link', { name: /download full text/i })).toHaveAttribute(
      'href',
      '/legal/terms-of-service-v2-4-0.txt',
    )
    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      '/legal/terms-of-service-v2-4-0.pdf',
    )
  })

  it('lists the three diff entries (Added, Updated, Removed)', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    expect(screen.getByText(/versioned changelog and comparison view/i)).toBeInTheDocument()
    expect(screen.getByText(/data retention and export language/i)).toBeInTheDocument()
    expect(screen.getByText(/ambiguous third-party sharing wording/i)).toBeInTheDocument()
  })

  it('keeps "Acknowledge and continue" disabled until the checkbox is checked', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    expect(screen.getByRole('button', { name: /acknowledge and continue/i })).toBeDisabled()
  })

  it('enables "Acknowledge and continue" after checking the confirmation checkbox', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    expect(screen.getByRole('button', { name: /acknowledge and continue/i })).toBeEnabled()
  })

  it('resets the checkbox when the modal is reopened after being dismissed', () => {
    renderSignup()
    // Open, check, cancel (without acknowledging)
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    // Reopen – checkbox must be unchecked again
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    expect(screen.getByLabelText(/i have reviewed version v2\.4\.0/i)).not.toBeChecked()
    expect(screen.getByRole('button', { name: /acknowledge and continue/i })).toBeDisabled()
  })
})

// ─── TOS acknowledgement flow ────────────────────────────────────────────────

describe('Signup – TOS acknowledgement', () => {
  it('closes the modal and enables the submit button after acknowledgement', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled()
  })

  it('shows the acknowledged confirmation message after TOS is accepted', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    const confirmation = screen.getByRole('status')
    expect(confirmation).toHaveTextContent(/terms v2\.4\.0 acknowledged/i)
    expect(confirmation).toHaveAttribute('aria-live', 'polite')
  })

  it('does not show the confirmation message before acknowledgement', () => {
    renderSignup()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// ─── Submit state machine & navigation ───────────────────────────────────────

describe('Signup – submit state machine', () => {
  function fillValidForm() {
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alex Morgan' } })
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme Corp' } })
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'alex@acme.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'ValidPass123!@#' } })
  }

  function acknowledgeAndSubmit() {
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  }

  it('enters a busy state immediately on submit', () => {
    vi.useFakeTimers()
    renderSignup()
    acknowledgeAndSubmit()

    const busy = screen.getByRole('button', { name: /creating account/i })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelector('.auth-submit-spinner')).toBeInTheDocument()
  })

  it('returns to idle and navigates to onboarding after SUBMIT_DEMO_MS elapses', () => {
    vi.useFakeTimers()
    renderSignup()
    acknowledgeAndSubmit()

    act(() => { vi.advanceTimersByTime(SUBMIT_DEMO_MS) })

    expect(screen.getByText('Onboarding Page')).toBeInTheDocument()
    const draft = JSON.parse(localStorage.getItem('veritasor_onboarding_draft') || '{}')
    expect(draft.business?.legalName).toBe('Acme Corp')
  })

  it('ignores a second click while the button is busy', () => {
    vi.useFakeTimers()
    renderSignup()
    acknowledgeAndSubmit()

    // Second click on the now-disabled busy button must not restart the timer
    const busy = screen.getByRole('button', { name: /creating account/i })
    fireEvent.click(busy)

    act(() => { vi.advanceTimersByTime(SUBMIT_DEMO_MS) })

    expect(screen.getByText('Onboarding Page')).toBeInTheDocument()
  })

  it('does not show a spinner before the form is submitted', () => {
    renderSignup()
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    expect(document.querySelector('.auth-submit-spinner')).not.toBeInTheDocument()
  })
})

// ─── Supplementary actions ───────────────────────────────────────────────────

describe('Signup – supplementary actions', () => {
  it('renders the TOS update notice with version references', () => {
    renderSignup()
    const notice = screen.getByRole('note')
    expect(notice).toHaveTextContent(/updated terms need review/i)
    expect(notice).toHaveTextContent(/v2\.4\.0/)
    expect(notice).toHaveTextContent(/v2\.3\.0/)
  })
})

// ─── Controlled Inputs and Validation (#850) ─────────────────────────────────

describe('Signup – Form validation & accessibility (#850)', () => {
  it('shows inline errors for all fields on empty submit and focuses the first invalid field (name)', () => {
    renderSignup()

    // Acknowledge terms first so submit button is enabled
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    const submitBtn = screen.getByRole('button', { name: /create account/i })
    expect(submitBtn).toBeEnabled()

    // Submit with empty inputs
    fireEvent.click(submitBtn)

    // Name field error and focus
    const nameInput = screen.getByLabelText(/full name/i)
    expect(nameInput).toHaveFocus()
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    const nameErrorId = nameInput.getAttribute('aria-describedby')
    expect(nameErrorId).toBeTruthy()
    expect(document.getElementById(nameErrorId!)).toHaveTextContent(/full name is required/i)

    // Company field error
    const companyInput = screen.getByLabelText(/company/i)
    expect(companyInput).toHaveAttribute('aria-invalid', 'true')
    const companyErrorId = companyInput.getAttribute('aria-describedby')
    expect(companyErrorId).toBeTruthy()
    expect(document.getElementById(companyErrorId!)).toHaveTextContent(/company is required/i)

    // Email field error
    const emailInput = screen.getByLabelText(/work email/i)
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    const emailErrorId = emailInput.getAttribute('aria-describedby')
    expect(emailErrorId).toBeTruthy()
    expect(document.getElementById(emailErrorId!)).toHaveTextContent(/email is required/i)

    // Password field error
    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
    expect(passwordInput.getAttribute('aria-describedby')).toMatch(/signup-password-help/)
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()

    // Does not navigate
    expect(screen.queryByText('Onboarding Page')).not.toBeInTheDocument()
  })

  it('validates each field on blur individually', () => {
    renderSignup()

    const nameInput = screen.getByLabelText(/full name/i)
    fireEvent.blur(nameInput)
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')

    const companyInput = screen.getByLabelText(/company/i)
    fireEvent.blur(companyInput)
    expect(screen.getByText(/company is required/i)).toBeInTheDocument()
    expect(companyInput).toHaveAttribute('aria-invalid', 'true')

    const emailInput = screen.getByLabelText(/work email/i)
    fireEvent.blur(emailInput)
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    const passwordInput = screen.getByLabelText(/^password$/i)
    fireEvent.blur(passwordInput)
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('rejects invalid email formats on blur and submit', () => {
    renderSignup()

    const emailInput = screen.getByLabelText(/work email/i)
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } })
    fireEvent.blur(emailInput)

    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    // Submit focuses email if name and company are filled
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Valid Name' } })
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Valid Co' } })

    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(emailInput).toHaveFocus()
  })

  it('validates password policy and displays policy failure message', () => {
    renderSignup()

    const passwordInput = screen.getByLabelText(/^password$/i)
    // Too short and missing symbols
    fireEvent.change(passwordInput, { target: { value: 'short1' } })
    fireEvent.blur(passwordInput)

    expect(screen.getByText(/use at least 12 characters/i)).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true')

    // Long enough but missing special character
    fireEvent.change(passwordInput, { target: { value: 'Password12345' } })
    expect(screen.getByText(/include a symbol/i)).toBeInTheDocument()
  })

  it('updates password strength meter levels and polite live announcement', () => {
    renderSignup()

    const passwordInput = screen.getByLabelText(/^password$/i)

    // Empty: meter not rendered
    expect(screen.queryByLabelText(/password strength preview/i)).not.toBeInTheDocument()

    // Level 1: Weak password
    fireEvent.change(passwordInput, { target: { value: 'abc' } })
    const meter = screen.getByLabelText(/password strength preview/i)
    expect(meter).toBeInTheDocument()
    expect(meter).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/password requirements not met/i)).toBeInTheDocument()
    const bars1 = document.querySelectorAll('.auth-strength-bar-active')
    expect(bars1.length).toBe(1)

    // Level 2 / 3: Moderate password
    fireEvent.change(passwordInput, { target: { value: 'Abcdefgh123' } })
    const bars2 = document.querySelectorAll('.auth-strength-bar-active')
    expect(bars2.length).toBeGreaterThanOrEqual(2)

    // Level 4: Strong password meeting policy
    fireEvent.change(passwordInput, { target: { value: 'SuperSecret123!@#' } })
    expect(screen.getByText(/strong enough for a production workspace/i)).toBeInTheDocument()
    const bars4 = document.querySelectorAll('.auth-strength-bar-active')
    expect(bars4.length).toBe(4)
  })

  it('persists prefilled company name to onboarding draft and navigates on success', () => {
    vi.useFakeTimers()
    renderSignup()

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Stark Industries' } })
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@stark.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'StarkCorp2026!#$' } })

    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    act(() => {
      vi.advanceTimersByTime(SUBMIT_DEMO_MS)
    })

    expect(screen.getByText('Onboarding Page')).toBeInTheDocument()
    const saved = JSON.parse(localStorage.getItem('veritasor_onboarding_draft') || '{}')
    expect(saved.business?.legalName).toBe('Stark Industries')
  })
})
