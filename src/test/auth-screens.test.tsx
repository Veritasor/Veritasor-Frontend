import { MemoryRouter } from 'react-router-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import ForgotPassword from '../pages/ForgotPassword'
import NotFound from '../pages/NotFound'
import { ToastProvider } from '../components/ToastContext'
import { SUBMIT_DEMO_MS } from '../components/SubmitButton'

function renderWithRouter(element: ReactElement) {
  return render(
    <MemoryRouter>
      <ToastProvider>{element}</ToastProvider>
    </MemoryRouter>,
  )
}

function renderAtUrl(element: ReactElement, url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>{element}</ToastProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('authentication screens visual system', () => {
  it('renders login with the shared hierarchy and feedback states', () => {
    renderWithRouter(<Login />)

    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /forgot password\?/i }),
    ).toHaveAttribute('href', '/forgot-password')
    const passwordField = screen.getByLabelText(/password/i)
    const describedBy = passwordField.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(screen.getByRole('alert')).toHaveAttribute('id', describedBy)
    expect(screen.getByRole('alert')).toHaveTextContent(
      /12 characters and one symbol/i,
    )
    expect(screen.getByText('!')).toHaveClass('auth-message-icon')
    expect(screen.getByRole('button', { name: /sso loading/i })).toBeDisabled()
  })

  it('renders signup support content and grouped fields', () => {
    renderWithRouter(<Signup />)

    expect(
      screen.getByRole('heading', { name: /set up your workspace/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /use 12\+ characters with uppercase, lowercase, number, and symbol/i,
      ),
    ).toHaveClass('auth-message-help')
    expect(
      screen.getByText(/strong enough for a production workspace/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /review changes/i }),
    ).toBeInTheDocument()
  })

  it('does not enter a loading submit when the login password is invalid', () => {
    renderWithRouter(<Login />)

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
    expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /verify your sign-in/i })).not.toBeInTheDocument()
  })

  it('shows a busy sign-in control then continues to MFA after the demo delay', () => {
    vi.useFakeTimers()
    renderWithRouter(<Login />)

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ValidPass12!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    const busy = screen.getByRole('button', { name: /signing in/i })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelector('.auth-submit-spinner')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(SUBMIT_DEMO_MS)
    })

    expect(
      screen.getByRole('heading', { name: /verify your sign-in/i }),
    ).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('locks a second signup submit while the create-account control is busy', () => {
    vi.useFakeTimers()
    renderWithRouter(<Signup />)

    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))
    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    const busy = screen.getByRole('button', { name: /creating account/i })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')

    fireEvent.click(busy)
    act(() => {
      vi.advanceTimersByTime(SUBMIT_DEMO_MS)
    })

    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled()
    vi.useRealTimers()
  })

  it('opens the terms changelog modal and enables signup after acknowledgement', () => {
    renderWithRouter(<Signup />)

    fireEvent.click(screen.getByRole('button', { name: /review changes/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download full text/i })).toHaveAttribute(
      'href',
      '/legal/terms-of-service-v2-4-0.txt',
    )
    expect(screen.getByRole('button', { name: /acknowledge and continue/i })).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeEnabled()
    expect(screen.getByText(/terms v2\.4\.0 acknowledged/i)).toBeInTheDocument()
  })

  it('renders forgot password messaging and recovery actions', () => {
    renderWithRouter(<ForgotPassword />)

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/verified email/i)).toHaveAttribute('type', 'email')
    expect(screen.getByRole('status')).toHaveTextContent(/recent reset attempts/i)
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  // #258 — Expired-link state
  it('renders expired-link state with a send-new-link CTA', () => {
    renderAtUrl(<ForgotPassword />, '/forgot-password?state=expired')

    expect(
      screen.getByRole('heading', { name: /link expired/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/expired/i)
    expect(
      screen.getByRole('button', { name: /send a new link/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /contact support/i }),
    ).toBeInTheDocument()
  })

  // #259 — New-password state with a valid token
  it('renders new-password entry with strength meter and match indicator fields', () => {
    renderAtUrl(
      <ForgotPassword />,
      '/forgot-password?state=reset&token=abc123',
    )

    expect(
      screen.getByRole('heading', { name: /set new password/i }),
    ).toBeInTheDocument()
    // Use exact label text to avoid ambiguity with "confirm password"
    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute(
      'type',
      'password',
    )
    expect(screen.getByLabelText(/^confirm password$/i)).toHaveAttribute(
      'type',
      'password',
    )
    expect(
      screen.getByLabelText(/password strength/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /set new password/i }),
    ).toBeInTheDocument()
    // Show/hide toggles
    expect(
      screen.getByRole('button', { name: /show new password/i }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByRole('button', { name: /show confirm password/i }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  // #259 — New-password state with missing token
  it('renders incomplete-link error when reset token is absent', () => {
    renderAtUrl(<ForgotPassword />, '/forgot-password?state=reset')

    expect(
      screen.getByRole('heading', { name: /incomplete link/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      /incomplete or corrupted/i,
    )
    expect(
      screen.getByRole('button', { name: /request a new link/i }),
    ).toBeInTheDocument()
  })
})

describe('not-found route', () => {
  it('orients users on unknown routes with safe navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/missing-page']}>
        <ToastProvider>
          <NotFound />
        </ToastProvider>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: /we could not find that page/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /back to dashboard/i }),
    ).toHaveAttribute('href', '/')
    expect(
      screen.getByRole('link', { name: /go to login/i }),
    ).toHaveAttribute('href', '/login')
    expect(screen.getByLabelText(/additional support links/i)).toBeInTheDocument()
  })
})
