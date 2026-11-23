import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProofShareModal from './ProofShareModal'
import { ToastProvider } from './ToastContext'

describe('ProofShareModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    })
  })

  const renderModal = (isOpen = true) => {
    return render(
      <ToastProvider>
        <ProofShareModal isOpen={isOpen} onClose={mockOnClose} attestationId="att-001" />
      </ToastProvider>
    )
  }

  it('does not render when isOpen is false', () => {
    renderModal(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders modal with correct title when open', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Share Attestation Proof')).toBeInTheDocument()
  })

  it('closes when close button is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes when Escape is pressed', () => {
    renderModal()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('generates public link successfully', () => {
    renderModal()
    const generateBtn = screen.getByText('Generate Link')
    fireEvent.click(generateBtn)
    expect(screen.getByLabelText('Generated link')).toBeInTheDocument()
  })

  it('shows error if password is too weak when password protected', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))
    
    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: 'weak' } })
    
    const generateBtn = screen.getByText('Generate Link')
    fireEvent.click(generateBtn)
    
    // Toast should show "Please enter a stronger password."
    // We check that the link wasn't generated
    expect(screen.queryByLabelText('Generated link')).not.toBeInTheDocument()
  })

  it('blocks link generation if password fails password policy', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))

    // Missing symbol and uppercase
    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: 'abcdefgh1234' } })

    const generateBtn = screen.getByText('Generate Link')
    fireEvent.click(generateBtn)

    expect(screen.queryByLabelText('Generated link')).not.toBeInTheDocument()
  })

  it('blocks link generation if password field is empty when password protected', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))

    const generateBtn = screen.getByText('Generate Link')
    fireEvent.click(generateBtn)

    expect(screen.queryByLabelText('Generated link')).not.toBeInTheDocument()
  })

  it('does not show failures list when input is empty', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))

    expect(screen.queryByLabelText('Password requirements')).not.toBeInTheDocument()
  })

  it('shows failures list from validatePassword when permission is password and input is non-empty', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))

    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: 'weak' } })

    expect(screen.getByLabelText('Password requirements')).toBeInTheDocument()
    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument()
    expect(screen.getByText('Include an uppercase letter.')).toBeInTheDocument()
    expect(screen.getByText('Include a number.')).toBeInTheDocument()
    expect(screen.getByText('Include a symbol.')).toBeInTheDocument()
  })

  it('hides failures list when password satisfies all rules', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))

    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })

    expect(screen.queryByLabelText('Password requirements')).not.toBeInTheDocument()
  })

  it('generates password-protected link with strong password', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))
    
    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    
    const generateBtn = screen.getByText('Generate Link')
    fireEvent.click(generateBtn)
    
    expect(screen.getByLabelText('Generated link')).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))
    const passwordInput = screen.getByLabelText('Password')
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByText('Show'))
    expect(passwordInput).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByText('Hide'))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('copies generated link to clipboard', async () => {
    renderModal()
    fireEvent.click(screen.getByText('Generate Link'))
    
    const copyBtn = screen.getByRole('button', { name: /Copy Link/i })
    fireEvent.click(copyBtn)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument()
    })
  })
})
