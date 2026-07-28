import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import WebhookSecretRotationDialog, { type RotatingSecret } from '../components/WebhookSecretRotationDialog'

const graceEndsAt = new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString()

const oldSecret: RotatingSecret = {
  masked: 'whsec_••••••••3f9a',
  full: 'whsec_old_full_value_3f9a',
  lastUsedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  expiresAt: graceEndsAt,
}

const newSecret: RotatingSecret = {
  masked: 'whsec_••••••••b2c7',
  full: 'whsec_new_full_value_b2c7',
  lastUsedAt: null,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
}

const defaultProps = {
  open: true,
  endpointLabel: 'https://example.com/hooks',
  oldSecret,
  newSecret,
  onConfirm: vi.fn(),
  onCancelRotation: vi.fn(),
  onClose: vi.fn(),
}

describe('WebhookSecretRotationDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelId = dialog.getAttribute('aria-labelledby')!
    expect(document.getElementById(labelId)).toHaveTextContent('Rotate signing secret')
  })

  it('shows the endpoint label in the description', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByText('https://example.com/hooks')).toBeInTheDocument()
  })

  it('renders both secret row labels', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByText('New secret')).toBeInTheDocument()
    expect(screen.getByText('Old secret')).toBeInTheDocument()
  })

  it('renders Active tag for new secret and Expiring tag for old secret', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Expiring')).toBeInTheDocument()
  })

  it('shows masked values for both secrets', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByText('whsec_••••••••3f9a')).toBeInTheDocument()
    expect(screen.getByText('whsec_••••••••b2c7')).toBeInTheDocument()
  })

  it('shows last-used time for old secret', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByText(/last used/i)).toBeInTheDocument()
  })

  it('shows "Not yet used" for new secret with no lastUsedAt', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByText('Not yet used')).toBeInTheDocument()
  })

  it('renders a countdown timer element', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })

  it('countdown aria-label mentions time remaining', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByRole('timer')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/time remaining/i),
    )
  })

  it('renders a copy button for each secret', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    const copyBtns = screen.getAllByRole('button', { name: /copy .* to clipboard/i })
    expect(copyBtns).toHaveLength(2)
  })

  it('copy buttons have specific accessible labels', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: /copy new secret/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy old secret/i })).toBeInTheDocument()
  })

  it('renders the cancel rotation button', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: /cancel rotation/i })).toBeInTheDocument()
  })

  it('calls onCancelRotation when cancel rotation is clicked', () => {
    const onCancelRotation = vi.fn()
    render(<WebhookSecretRotationDialog {...defaultProps} onCancelRotation={onCancelRotation} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel rotation/i }))
    expect(onCancelRotation).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when Confirm rotation is clicked', () => {
    const onConfirm = vi.fn()
    render(<WebhookSecretRotationDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /confirm rotation/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when Close footer button is clicked', () => {
    const onClose = vi.fn()
    render(<WebhookSecretRotationDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when ✕ header button is clicked', () => {
    const onClose = vi.fn()
    render(<WebhookSecretRotationDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<WebhookSecretRotationDialog {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<WebhookSecretRotationDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(document.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when dialog itself is clicked', () => {
    const onClose = vi.fn()
    render(<WebhookSecretRotationDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses the dialog on open', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    act(() => { vi.advanceTimersByTime(10) })
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('expiry deadline is wrapped in a <time> element with dateTime', () => {
    render(<WebhookSecretRotationDialog {...defaultProps} />)
    const timeEls = Array.from(document.querySelectorAll('time'))
    const deadline = timeEls.find((el) => el.getAttribute('dateTime') === graceEndsAt)
    expect(deadline).toBeTruthy()
  })

  it('shows expired state when grace period is over', () => {
    const expiredSecret = {
      ...oldSecret,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    }
    render(<WebhookSecretRotationDialog {...defaultProps} oldSecret={expiredSecret} />)
    expect(screen.getByRole('timer')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/expired/i),
    )
  })
})
