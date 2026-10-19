import React from 'react'
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
    expect(screen.queryByRole('dialog')).not.toBeInDocument()
  })

  it('renders modal with correct title when open', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInDocument()
    expect(screen.getByText('Share Attestation Proof')).toBeInDocument()
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
    expect(screen.getByLabelText('Generated link')).toBeInDocument()
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
    expect(screen.queryByLabelText('Generated link')).not.toBeInDocument()
  })

  it('generates password-protected link with strong password', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Password Protected'))
    
    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    
    const generateBtn = screen.getByText('Generate Link')
    fireEvent.click(generateBtn)
    
    expect(screen.getByLabelText('Generated link')).toBeInDocument()
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
      expect(screen.getByText(/Copied!/i)).toBeInDocument()
    })
  })
})
