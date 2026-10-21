import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import App from '../App'
import Layout from '../components/Layout'
import ToastContainer from '../components/ToastContainer'
import { ToastProvider, useToast } from '../components/ToastContext'
import { CookieConsentProvider } from '../components/CookieConsentContext'
import { LocaleProvider } from '../i18n/provider'

describe('app-level toasts', () => {
  it('shows an error toast for an invalid email on /forgot-password', async () => {
    window.history.pushState({}, '', '/forgot-password')
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/Verified email/i), 'foo')
    await user.click(screen.getByRole('button', { name: /Send reset link/i }))

    expect(
      await screen.findByText('Please enter a valid verified email address.'),
    ).toBeInTheDocument()
  })

  it('keeps a toast raised before navigating from /login to /dashboard', async () => {
    function LoginStub() {
      const { addToast } = useToast()
      const navigate = useNavigate()
      return (
        <button
          onClick={() => {
            addToast('Second factor verified. Redirecting…', 'success')
            navigate('/dashboard')
          }}
        >
          go
        </button>
      )
    }

    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <ToastProvider>
          <CookieConsentProvider>
            <MemoryRouter initialEntries={['/login']}>
              <Routes>
                <Route path="/login" element={<LoginStub />} />
                <Route element={<Layout />}>
                  <Route path="dashboard" element={<div data-testid="dash">Dashboard</div>} />
                </Route>
              </Routes>
              <ToastContainer />
            </MemoryRouter>
          </CookieConsentProvider>
        </ToastProvider>
      </LocaleProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'go' }))

    expect(screen.getByTestId('dash')).toBeInTheDocument()
    expect(screen.getByText('Second factor verified. Redirecting…')).toBeInTheDocument()
  })
})
