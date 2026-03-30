import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import ForgotPassword from '../pages/ForgotPassword'

function renderWithRouter(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('authentication screens visual system', () => {
  it('renders login with the shared hierarchy and feedback states', () => {
    renderWithRouter(<Login />)

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /forgot password\?/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/12 characters and one symbol/i)
    expect(screen.getByRole('button', { name: /sso loading/i })).toBeDisabled()
  })

  it('renders signup support content and grouped fields', () => {
    renderWithRouter(<Signup />)

    expect(screen.getByRole('heading', { name: /set up your workspace/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(screen.getByText(/strong enough for a production workspace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders forgot password messaging and recovery actions', () => {
    renderWithRouter(<ForgotPassword />)

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/verified email/i)).toHaveAttribute('type', 'email')
    expect(screen.getByRole('status')).toHaveTextContent(/recent reset attempts/i)
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })
})
