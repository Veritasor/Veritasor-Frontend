import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { FormEvent } from 'react'
import SubmitButton, { SUBMIT_DEMO_MS } from './SubmitButton'

describe('SUBMIT_DEMO_MS', () => {
  it('is a bounded demo delay', () => {
    expect(SUBMIT_DEMO_MS).toBeGreaterThanOrEqual(1)
    expect(SUBMIT_DEMO_MS).toBeLessThanOrEqual(1000)
  })
})

describe('SubmitButton', () => {
  it('renders the idle label and stays enabled', () => {
    render(<SubmitButton idleLabel="Sign in" busyLabel="Signing in…" />)

    const button = screen.getByRole('button', { name: /sign in/i })
    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button).toHaveClass('auth-button', 'auth-button-primary', 'auth-submit')
    expect(button).toHaveAttribute('type', 'submit')
    expect(document.querySelector('.auth-submit-spinner')).not.toBeInTheDocument()
  })

  it('swaps to the busy label, spinner, and busy semantics', () => {
    render(<SubmitButton idleLabel="Sign in" busyLabel="Signing in…" busy />)

    const button = screen.getByRole('button', { name: /signing in/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
    const spinner = document.querySelector('.auth-submit-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
    expect(spinner).toHaveAttribute('focusable', 'false')
  })

  it('disables without a spinner when only disabled is set', () => {
    render(
      <SubmitButton idleLabel="Create account" busyLabel="Creating account…" disabled />,
    )

    const button = screen.getByRole('button', { name: /create account/i })
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
    expect(document.querySelector('.auth-submit-spinner')).not.toBeInTheDocument()
  })

  it('appends className without dropping auth classes', () => {
    render(
      <SubmitButton
        idleLabel="Sign in"
        busyLabel="Signing in…"
        className="extra-submit"
      />,
    )

    expect(screen.getByRole('button', { name: /sign in/i })).toHaveClass(
      'auth-button',
      'auth-submit',
      'extra-submit',
    )
  })

  it('does not fire submit while busy', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <SubmitButton idleLabel="Save" busyLabel="Saving…" busy />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: /saving/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not fire submit when disabled', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <SubmitButton idleLabel="Create account" busyLabel="Creating account…" disabled />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits once from the idle state', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <SubmitButton idleLabel="Sign in" busyLabel="Signing in…" />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
