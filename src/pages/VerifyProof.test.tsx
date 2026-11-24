import { webcrypto } from 'node:crypto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttestationsProvider } from '../state/attestations'
import { createProofPasswordVerifier } from '../utils/proofShare'
import VerifyProof from './VerifyProof'

function renderProof(initialEntry: string) {
  return render(
    <AttestationsProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/proof/:id" element={<VerifyProof />} />
        </Routes>
      </MemoryRouter>
    </AttestationsProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VerifyProof', () => {
  it('renders the attestation status and public verification details', () => {
    renderProof('/proof/att-001?share=att-001')

    expect(screen.getByRole('heading', { name: 'Attestation att-001' })).toBeInTheDocument()
    expect(screen.getByLabelText('Attestation status: verified')).toHaveTextContent('Verified')
    expect(screen.getByText('0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8')).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown attestation', () => {
    renderProof('/proof/att-missing?share=att-missing')

    expect(screen.getByRole('heading', { name: 'Proof not found' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No attestation matches this proof link.')
  })

  it('shows an expired state when the selected duration has elapsed', () => {
    const createdAt = new Date(Date.now() - 60 * 60 * 1000 - 1).toISOString()
    const params = new URLSearchParams({ share: 'att-001', expires: '1hour', createdAt })
    renderProof(`/proof/att-001?${params}`)

    expect(screen.getByRole('heading', { name: 'Proof link expired' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('This shared proof link has expired.')
  })

  it('requires and verifies the password for a protected link', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const verifier = await createProofPasswordVerifier('CorrectPass123!')
    renderProof(`/proof/att-001?share=att-001&protected=1#password=${verifier}`)

    expect(screen.getByRole('heading', { name: 'Protected attestation proof' })).toBeInTheDocument()
    expect(screen.queryByText('84,320.00 USD')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'incorrect' } })
    fireEvent.click(screen.getByRole('button', { name: 'View proof' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The password is incorrect.')
    expect(screen.queryByText('84,320.00 USD')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'CorrectPass123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'View proof' }))
    await waitFor(() => {
      expect(screen.getByText('84,320.00 USD')).toBeInTheDocument()
    })
  })
})
